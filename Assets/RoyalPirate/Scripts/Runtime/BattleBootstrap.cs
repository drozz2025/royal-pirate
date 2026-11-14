using System;
using RoyalPirate.Domain;
using RoyalPirate.Runtime.Combat;
using RoyalPirate.Services;
using UnityEngine;

namespace RoyalPirate.Runtime
{
    // Existing Integration.unity entry point, now delegates input/HUD/cameras/effects to one component each.
    public sealed class BattleBootstrap : MonoBehaviour
    {
        public Material materialTemplate;
        public AimSettings aimSettings = new AimSettings();
        [Range(2,120)] public float turnSeconds=20;
        [Range(0,8)] public float maxWindAcceleration=1.2f;
        public int battleSeed=1432026;
        public bool diagnosticHud=true, useDefaultTouchControls=true, loadSavedShip=true;
        public CombatEffectQuality effectQuality=CombatEffectQuality.Low;
        public ShipView Player { get; private set; }
        public ShipView Enemy { get; private set; }
        public CombatSession Session { get; private set; }
        public CannonWeapon PlayerWeapon { get; private set; }
        public CannonWeapon EnemyWeapon { get; private set; }
        public CombatHudState Snapshot { get; private set; }
        public event Action<CombatHudState> HudChanged;
        public bool Ready { get; private set; }
        public bool CanPlayerAct => Ready && !paused && Session.Turns.ActivePlayer==0 && Session.Turns.Phase==BattlePhase.Aiming;
        public string StartupError { get; private set; }
        TurnWind windSequence;
        ReinforcedShot playerAbility,enemyAbility;
        Vec3 wind;
        float yaw,elevation=15,power=.24f,botDelay,resolveDelay;
        int observedTurn,shotTurn,shotSide;
        bool resolutionPending,paused,appPaused;
        bool hasFocus=true;
        Material wood,sail,metal,water,effectsMaterial;
        CombatCamera cameraRig;
        CombatEffects effects;
        GameObject world;
        float previousFixedStep;
        int previousFrameRate;
        bool ownsGlobalTiming;
        void Start()
        {
            previousFixedStep=Time.fixedDeltaTime; previousFrameRate=Application.targetFrameRate;
            ownsGlobalTiming=true;
            Application.targetFrameRate=60; Time.fixedDeltaTime=.02f; Screen.orientation=ScreenOrientation.Portrait;
            try
            {
                aimSettings.Validate(); power=aimSettings.ClampPower(power); elevation=Mathf.Clamp(elevation,aimSettings.minElevation,aimSettings.maxElevation);
                Session=new CombatSession(turnSeconds); windSequence=new TurnWind(unchecked((uint)battleSeed),maxWindAcceleration);
                var source=Resources.Load<TextAsset>("Navio01");
                if(source==null) throw new InvalidOperationException("Missing Navio01 catalog.");
                var catalog=JsonUtility.FromJson<ShipCatalog>(source.text); catalog.Validate();
                world=new GameObject("CombatWorld"); world.transform.SetParent(transform,false);
                wood=MakeMaterial(new Color(.52f,.25f,.08f)); sail=MakeMaterial(new Color(.9f,.78f,.45f));
                metal=MakeMaterial(new Color(.12f,.18f,.23f)); water=MakeMaterial(new Color(.03f,.58f,.77f));
                var particleShader=Shader.Find("Universal Render Pipeline/Particles/Unlit");
                effectsMaterial=particleShader!=null?new Material(particleShader):MakeMaterial(new Color(.9f,.65f,.3f));
                var sea=GameObject.CreatePrimitive(PrimitiveType.Plane); sea.name="Ocean_Greybox"; sea.transform.SetParent(world.transform,false);
                sea.transform.localScale=Vector3.one*30; sea.transform.position=Vector3.up*ProjectileView.WaterHeight;
                sea.GetComponent<Renderer>().sharedMaterial=water; sea.GetComponent<Collider>().enabled=false;
                var loadout=ShipLoadout.CreateStarter(catalog);
                // Battle does not write saves or change a persistent loadout.
                if(loadSavedShip) loadout=new LocalLoadoutStore(Application.persistentDataPath,catalog).Load()??loadout;
                Player=MakeShip("Player",Vector3.zero,catalog,loadout);
                Enemy=MakeShip("Opponent",new Vector3(0,0,32),catalog,ShipLoadout.CreateStarter(catalog)); Enemy.transform.rotation=Quaternion.Euler(0,180,0);
                PlayerWeapon=MakeCannon(Player); EnemyWeapon=MakeCannon(Enemy);
                playerAbility=MakeAbility(Player,PlayerWeapon); enemyAbility=MakeAbility(Enemy,EnemyWeapon);
                var cameraObject=new GameObject("CannonCamera"); cameraObject.transform.SetParent(world.transform,false);
                var camera=cameraObject.AddComponent<Camera>(); camera.tag="MainCamera"; camera.fieldOfView=60; camera.nearClipPlane=.1f; camera.farClipPlane=400;
                camera.clearFlags=CameraClearFlags.SolidColor; camera.backgroundColor=new Color(.18f,.65f,.94f);
                cameraObject.AddComponent<AudioListener>(); cameraRig=cameraObject.AddComponent<CombatCamera>();
                cameraRig.Initialize(PlayerWeapon.Module!=null?PlayerWeapon.Module.transform:Player.transform,Enemy.transform);
                var light=new GameObject("Sun").AddComponent<Light>(); light.transform.SetParent(world.transform,false);
                light.type=LightType.Directional; light.intensity=1.2f; light.transform.rotation=Quaternion.Euler(45,-30,0);
                effects=world.AddComponent<CombatEffects>(); effects.Quality=effectQuality; effects.Initialize(effectsMaterial);
                foreach(var destruction in world.GetComponentsInChildren<ModuleDestruction>()) destruction.PhysicalDebris=effectQuality!=CombatEffectQuality.Off;
                if(useDefaultTouchControls) gameObject.AddComponent<TouchCombatInput>().Initialize(this);
                Ready=true; BeginTurn(); EvaluateOutcome(); PublishHud();
                if(diagnosticHud) gameObject.AddComponent<CombatHud>().Initialize(this);
            }
            catch(Exception exception) { StartupError=exception.Message; Debug.LogException(exception); Ready=false; enabled=false; }
        }
        Material MakeMaterial(Color color)
        {
            if(materialTemplate!=null) return new Material(materialTemplate) {color=color};
            var shader=Shader.Find("Universal Render Pipeline/Lit");
            if(shader==null) throw new InvalidOperationException("URP shader unavailable. Run Royal Pirate/Prepare Mobile Project.");
            return new Material(shader) {color=color};
        }
        ShipView MakeShip(string name,Vector3 position,ShipCatalog catalog,ShipLoadout loadout)
        {
            var ship=new GameObject(name).AddComponent<ShipView>(); ship.transform.SetParent(world.transform,false); ship.transform.position=position;
            ship.Assemble(catalog,loadout,wood,sail,metal); return ship;
        }
        CannonWeapon MakeCannon(ShipView ship)
        {
            var weapon=ship.gameObject.AddComponent<CannonWeapon>(); weapon.Initialize(ship,ship.First(ModuleKind.Cannon),metal,ShotFinished);
            weapon.Impacted+=OnImpact; return weapon;
        }
        ReinforcedShot MakeAbility(ShipView ship,CannonWeapon weapon)
        {
            var hero=ship.First(ModuleKind.HeroSlot);
            return hero==null || weapon.Module==null?null:new ReinforcedShot(weapon.Module.State.InstanceId,()=>!hero.State.IsDestroyed);
        }
        void BeginTurn()
        {
            observedTurn=Session.Turns.TurnNumber; wind=windSequence.ForTurn(observedTurn); botDelay=0; resolutionPending=false;
            PlayerWeapon.CancelShot(); EnemyWeapon.CancelShot(); cameraRig.Aim(); PlayerWeapon.Aim(yaw,elevation);
        }
        void Update()
        {
            if(!Ready || paused) return;
            EvaluateOutcome();
            if(Session.Outcome!=BattleOutcome.Undecided) { PublishHud(); return; }
            Session.Tick(Time.deltaTime);
            if(observedTurn!=Session.Turns.TurnNumber) BeginTurn();
            if(resolutionPending)
            {
                resolveDelay-=Time.deltaTime;
                if(resolveDelay<=0)
                {
                    resolutionPending=false; Session.Resolve(shotTurn);
                    if(observedTurn!=Session.Turns.TurnNumber) BeginTurn();
                }
            }
            if(Session.Turns.ActivePlayer==1 && Session.Turns.Phase==BattlePhase.Aiming)
            {
                botDelay+=Time.deltaTime;
                if(botDelay>=1.1f)
                {
                    var target=Player.First(ModuleKind.Hull);
                    if(target!=null && EnemyWeapon.Muzzle!=null)
                    {
                        var aim=BotAimSolver.Choose(ShipView.ToDomain(EnemyWeapon.Muzzle.position),ShipView.ToDomain(target.transform.position),wind,180,aimSettings,
                            unchecked((uint)(battleSeed+observedTurn*31)));
                        if(enemyAbility!=null && enemyAbility.CanActivate(observedTurn)) enemyAbility.TryActivate(EnemyWeapon.Module.State.InstanceId,observedTurn);
                        Fire(1,aim.Yaw,aim.Elevation,aim.Power);
                    }
                }
            }
            PublishHud();
        }
        void EvaluateOutcome()
        {
            PlayerWeapon.RefreshModule(); EnemyWeapon.RefreshModule();
            if(PlayerWeapon.Module!=null) cameraRig.SetCannon(PlayerWeapon.Module.transform);
            var before=Session.Outcome;
            Session.Evaluate(Player.IsSunk,Enemy.IsSunk,Player.HasCannon,Enemy.HasCannon);
            if(before==BattleOutcome.Undecided && Session.Outcome!=before)
            {
                PlayerWeapon.CancelShot(); EnemyWeapon.CancelShot(); resolutionPending=false;
                cameraRig.Victory(Session.Outcome==BattleOutcome.PlayerVictory?Enemy.transform:Player.transform);
            }
        }
        public void DragAim(float normalizedX,float normalizedY)
        {
            if(!CanPlayerAct) return;
            aimSettings.Drag(ref yaw,ref elevation,normalizedX,normalizedY); PlayerWeapon.Aim(yaw,elevation);
        }
        public void SetPower(float normalized)
        {
            if(CanPlayerAct) power=aimSettings.ClampPower(Mathf.Lerp(aimSettings.minPower,aimSettings.maxPower,Mathf.Clamp01(normalized)));
        }
        public bool TryPlayerFire() => CanPlayerAct && Fire(0,yaw,elevation,power);
        public bool TryAbility() => CanPlayerAct && PlayerWeapon.CanFire && playerAbility!=null && playerAbility.TryActivate(PlayerWeapon.Module.State.InstanceId,Session.Turns.TurnNumber);
        bool Fire(int side,float shotYaw,float shotElevation,float shotPower)
        {
            var weapon=side==0?PlayerWeapon:EnemyWeapon; var ability=side==0?playerAbility:enemyAbility;
            if(!weapon.CanFire || Session.Turns.ActivePlayer!=side || Session.Turns.Phase!=BattlePhase.Aiming) return false;
            weapon.Aim(shotYaw,shotElevation);
            int turn=Session.Turns.TurnNumber;
            int damage=ability!=null?ability.DamageFor(weapon.Module.WeaponDamage,turn):weapon.Module.WeaponDamage;
            var request=new ShotRequest {Origin=ShipView.ToDomain(weapon.Muzzle.position),Velocity=Ballistics.LaunchVelocity(shotYaw,shotElevation,shotPower),WindAcceleration=wind,Damage=damage};
            if(!ShotValidation.IsValid(request) || !Session.TryFire(side,weapon.CanFire)) return false;
            shotTurn=turn; shotSide=side;
            if(!weapon.TryFire(request)) { Session.Resolve(turn); return false; }
            effects.PlayMuzzle(weapon.Muzzle.position,weapon.Muzzle.forward);
            if(side==0) cameraRig.Follow(weapon.Projectile.transform);
            PublishHud(); return true;
        }
        void OnImpact(ProjectileImpact impact)
        {
            if(Session.Turns.Phase!=BattlePhase.Resolving || Session.Turns.TurnNumber!=shotTurn) return;
            effects.Play(impact);
            if(impact.Kind==ImpactKind.Module && impact.AppliedDamage>0) cameraRig.Impact(impact.Point);
        }
        void ShotFinished()
        {
            if(Session.Turns.Phase!=BattlePhase.Resolving || Session.Turns.TurnNumber!=shotTurn || Session.Turns.ActivePlayer!=shotSide) return;
            EvaluateOutcome();
            if(Session.Outcome==BattleOutcome.Undecided) { resolutionPending=true; resolveDelay=.45f; }
        }
        void PublishHud()
        {
            Snapshot=new CombatHudState {PlayerName="Player",EnemyName="BlackWave (bot)",HeroName="Gunner (test hero slot)",
                PlayerHealth=Player.HealthFraction,EnemyHealth=Enemy.HealthFraction,Remaining=Session.RemainingSeconds,Power=power,Yaw=yaw,Elevation=elevation,
                Wind=wind,Phase=Session.Turns.Phase,Outcome=Session.Outcome,ActivePlayer=Session.Turns.ActivePlayer,TurnNumber=Session.Turns.TurnNumber,
                CanFire=CanPlayerAct && PlayerWeapon.CanFire,CanUseAbility=CanPlayerAct && PlayerWeapon.CanFire && playerAbility!=null && playerAbility.CanActivate(Session.Turns.TurnNumber),
                AbilityArmed=playerAbility!=null && playerAbility.IsArmed(Session.Turns.TurnNumber)};
            HudChanged?.Invoke(Snapshot);
        }
        void Pause(bool value)
        {
            paused=value;
            if(PlayerWeapon!=null && PlayerWeapon.Projectile!=null) PlayerWeapon.Projectile.Suspended=value;
            if(EnemyWeapon!=null && EnemyWeapon.Projectile!=null) EnemyWeapon.Projectile.Suspended=value;
        }
        void OnApplicationPause(bool value) { appPaused=value; Pause(appPaused || !hasFocus); }
        void OnApplicationFocus(bool focus) { hasFocus=focus; Pause(appPaused || !hasFocus); }
        void OnGUI()
        {
            if(StartupError!=null) GUI.Box(new Rect(20,40,Screen.width-40,160),"Combat could not start: "+StartupError);
        }
        void OnDestroy()
        {
            Ready=false;
            if(PlayerWeapon!=null) PlayerWeapon.CancelShot(); if(EnemyWeapon!=null) EnemyWeapon.CancelShot();
            foreach(var material in new[] {wood,sail,metal,water,effectsMaterial}) if(material!=null) Destroy(material);
            // OnDestroy may run before Start (for example, a scene unloaded in the same frame).
            // Never replace global timing with uninitialised zero values.
            if(ownsGlobalTiming)
            {
                Time.fixedDeltaTime=previousFixedStep; Application.targetFrameRate=previousFrameRate;
                ownsGlobalTiming=false;
            }
        }
    }
}

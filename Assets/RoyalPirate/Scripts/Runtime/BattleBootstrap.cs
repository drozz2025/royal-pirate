using RoyalPirate.Domain;
using UnityEngine;
using UnityEngine.InputSystem;
using RoyalPirate.Services;

namespace RoyalPirate.Runtime
{
    // Integration harness, not final art, final UI, production economy or a release build.
    public sealed class BattleBootstrap : MonoBehaviour
    {
        public Material materialTemplate;
        ShipView player, enemy;
        CannonWeapon playerWeapon, enemyWeapon;
        TurnState turns;
        Vec3 wind;
        float yaw, elevation = 15, power = 0.24f, botDelay;
        int windTurn;
        int playerShotTurn, enemyShotTurn;
        Material wood, sail, metal, water;
        string error;
        void Start()
        {
            Application.targetFrameRate = 60; Time.fixedDeltaTime = 0.02f;
            Screen.orientation = ScreenOrientation.Portrait;
            try
            {
                var source = Resources.Load<TextAsset>("Navio01");
                if (source == null) throw new System.InvalidOperationException("Missing Navio01 catalog.");
                var catalog = JsonUtility.FromJson<ShipCatalog>(source.text); catalog.Validate();
                wood = MakeMaterial(new Color(0.52f,0.25f,0.08f)); sail = MakeMaterial(new Color(0.9f,0.78f,0.45f));
                metal = MakeMaterial(new Color(0.12f,0.18f,0.23f)); water = MakeMaterial(new Color(0.03f,0.58f,0.77f));
                var sea = GameObject.CreatePrimitive(PrimitiveType.Plane); sea.name = "Ocean_Greybox";
                sea.transform.localScale = Vector3.one * 30; sea.transform.position = Vector3.down;
                sea.GetComponent<Renderer>().sharedMaterial = water; sea.GetComponent<Collider>().enabled = false;
                var store = new LocalLoadoutStore(Application.persistentDataPath, catalog);
                var loadout = store.Load() ?? ShipLoadout.CreateStarter(catalog);
                store.Save(loadout);
                // One loadout contract is used by shipyard and battle assembly; no separate battle ship definition.
                player = MakeShip("Player", Vector3.zero, catalog, loadout);
                enemy = MakeShip("Opponent", new Vector3(0,0,32), catalog, ShipLoadout.CreateStarter(catalog));
                enemy.transform.rotation = Quaternion.Euler(0,180,0);
                turns = new TurnState();
                playerWeapon = MakeCannon(player); enemyWeapon = MakeCannon(enemy);
                var cameraObject = new GameObject("CannonCamera"); var camera = cameraObject.AddComponent<Camera>();
                camera.tag = "MainCamera"; camera.transform.position = new Vector3(0,5.5f,-6);
                camera.transform.LookAt(new Vector3(0,3,27)); camera.fieldOfView = 65;
                camera.clearFlags = CameraClearFlags.SolidColor; camera.backgroundColor = new Color(0.18f,0.65f,0.94f);
                cameraObject.AddComponent<AudioListener>();
                var light = new GameObject("Sun").AddComponent<Light>(); light.type = LightType.Directional;
                light.intensity = 1.2f; light.transform.rotation = Quaternion.Euler(45,-30,0);
                RenderSettings.ambientLight = new Color(0.6f,0.7f,0.8f);
            }
            catch (System.Exception exception) { error = exception.Message; Debug.LogException(exception); enabled = false; }
        }
        Material MakeMaterial(Color color)
        {
            if (materialTemplate != null) return new Material(materialTemplate) { color = color };
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) throw new System.InvalidOperationException("URP shader unavailable. Run Royal Pirate/Prepare Mobile Project.");
            return new Material(shader) { color = color };
        }
        ShipView MakeShip(string name, Vector3 position, ShipCatalog catalog, ShipLoadout loadout)
        {
            var ship = new GameObject(name).AddComponent<ShipView>(); ship.transform.position = position;
            ship.Assemble(catalog, loadout, wood, sail, metal); return ship;
        }
        CannonWeapon MakeCannon(ShipView ship)
        {
            ModuleView cannon = null;
            foreach (var part in ship.Modules) if (part.Kind == ModuleKind.Cannon) { cannon = part; break; }
            var weapon = ship.gameObject.AddComponent<CannonWeapon>();
            weapon.Initialize(ship, cannon, metal, () =>
            {
                if (player.IsSunk || enemy.IsSunk) turns.Finish();
                else turns.ResolveShot(ship == player ? playerShotTurn : enemyShotTurn);
            });
            return weapon;
        }
        void Update()
        {
            if (turns == null || turns.Phase == BattlePhase.Finished) return;
            if (player.IsSunk || enemy.IsSunk) { turns.Finish(); return; }
            turns.Tick(Time.deltaTime);
            if (windTurn != turns.TurnNumber)
            { windTurn = turns.TurnNumber; wind = new Vec3(Random.Range(-1.2f,1.2f),0,0); botDelay = 0; }
            if (turns.ActivePlayer == 1 && turns.Phase == BattlePhase.Aiming)
            {
                botDelay += Time.deltaTime;
                if (botDelay > 1) Fire(1, 180 + Random.Range(-4f,4f), Random.Range(10f,20f), Random.Range(0.20f,0.30f));
            }
            var pointer = Pointer.current;
            if (turns.ActivePlayer == 0 && turns.Phase == BattlePhase.Aiming && pointer != null && pointer.press.isPressed &&
                pointer.position.ReadValue().y > Screen.height * 0.35f)
            {
                var delta = pointer.delta.ReadValue();
                yaw = Mathf.Clamp(yaw + delta.x / Screen.width * 80,-40,40);
                elevation = Mathf.Clamp(elevation + delta.y / Screen.height * 80,5,70);
            }
        }
        void Fire(int side, float shotYaw, float shotElevation, float shotPower)
        {
            var weapon = side == 0 ? playerWeapon : enemyWeapon;
            var ship = side == 0 ? player : enemy;
            if (!weapon.CanFire || turns.Phase != BattlePhase.Aiming || turns.ActivePlayer != side) return;
            var shot = new ShotRequest { Origin = ShipView.ToDomain(ship.transform.TransformPoint(new Vector3(0,2.5f,5.5f))),
                Velocity = Ballistics.LaunchVelocity(shotYaw,shotElevation,shotPower), WindAcceleration = wind, Damage = 80 };
            int shotTurn = turns.TurnNumber;
            if (side == 0) playerShotTurn = shotTurn; else enemyShotTurn = shotTurn;
            if (turns.TryFire(side) && !weapon.TryFire(shot)) turns.ResolveShot(shotTurn);
        }
        void OnGUI()
        {
            float scale = Mathf.Min(Screen.width / 420f, Screen.height / 800f);
            GUI.matrix = Matrix4x4.TRS(Vector3.zero,Quaternion.identity,Vector3.one * scale);
            float width = Screen.width/scale, height = Screen.height/scale;
            var style = new GUIStyle(GUI.skin.label) { fontSize = 18 };
            GUILayout.BeginArea(new Rect(14,30,width-28,180));
            GUILayout.Label("ROYAL PIRATE — Integration test",style);
            if (error != null) GUILayout.Label(error,style);
            else if (turns != null)
            {
                GUILayout.Label($"Player {player.HealthFraction:P0} | Enemy {enemy.HealthFraction:P0}",style);
                GUILayout.Label($"{turns.Phase} · Turn {turns.ActivePlayer+1} · {turns.Remaining:0}s",style);
                GUILayout.Label($"Wind acceleration: {wind.x:0.0} m/s²",style);
                GUI.Box(new Rect(0,105,(width-28)*player.HealthFraction,12), "");
                GUI.Box(new Rect(0,123,(width-28)*enemy.HealthFraction,12), "");
            }
            GUILayout.EndArea();
            if (turns == null) return;
            GUILayout.BeginArea(new Rect(16,height-245,width-32,235));
            GUILayout.Label($"Yaw {yaw:0}° / Elevation {elevation:0}° — drag above controls",style);
            yaw = GUILayout.HorizontalSlider(yaw,-40,40,GUILayout.Height(25));
            elevation = GUILayout.HorizontalSlider(elevation,5,70,GUILayout.Height(25));
            GUILayout.Label($"Power {power:P0}",style);
            power = GUILayout.HorizontalSlider(power,0,1,GUILayout.Height(30));
            GUI.enabled = turns.ActivePlayer == 0 && turns.Phase == BattlePhase.Aiming && playerWeapon.CanFire;
            if (GUILayout.Button("FIRE",GUILayout.Height(54))) Fire(0,yaw,elevation,power);
            GUI.enabled = true; GUILayout.EndArea();
        }
        void OnDestroy()
        {
            foreach (var material in new[] {wood,sail,metal,water}) if (material != null) Destroy(material);
        }
    }
}

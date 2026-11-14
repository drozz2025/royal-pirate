using System;
using System.Linq;
using RoyalPirate.Domain;
using RoyalPirate.Progression;
using RoyalPirate.Services;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

namespace RoyalPirate.UI
{
    public sealed class HarbourBootstrap : MonoBehaviour
    {
        public Material materialTemplate;
        public ShipArtBindings shipArt;
        public PanelSettings panelTemplate;
        public string saveDirectoryOverride;
        public ProgressionSession Session { get; private set; }
        public ShipyardPreview Preview { get; private set; }
        public MenuNavigation Navigation { get; }=new MenuNavigation();
        public VisualElement Root => root;
        ShipCatalog catalog; EconomyConfig config; AtomicProgressStore store;
        UIDocument document; PanelSettings panel; VisualElement root,safe,body,footer;
        Label balance,identity,status; string selectedMount="mount.bow.01",notice="";
        bool confirmRemoval; Rect lastSafe; int lastWidth,lastHeight;
        public void Start()
        {
            Application.targetFrameRate=60; Screen.orientation=ScreenOrientation.Portrait;
            BuildDocument();
            try
            {
                catalog=JsonUtility.FromJson<ShipCatalog>(RequiredText("Navio01"));
                config=JsonUtility.FromJson<EconomyConfig>(RequiredText("Work4Economy"));
                string directory=string.IsNullOrEmpty(saveDirectoryOverride)?Application.persistentDataPath:saveDirectoryOverride;
                store=new AtomicProgressStore(directory,new UnityProgressCodec(),catalog,config);
                Session=new ProgressionSession(catalog,config,store);
                if(store.RecoveredBackup) notice="Progress recovered from backup.";
                Preview=new GameObject("HarbourPreview").AddComponent<ShipyardPreview>(); Preview.transform.SetParent(transform,false);
                Preview.Initialize(materialTemplate,shipArt); Preview.Selected+=SelectMount;
                AudioListener.volume=Session.Snapshot.sound?1:0;
                Open(MenuScreen.Home);
            }
            catch(Exception e)
            {
                Debug.LogException(e); safe.Clear();
                safe.Add(Text("Unable to open harbour","title")); safe.Add(Text(e.Message,"error"));
                safe.Add(Text("Your progress files were preserved. Resolve the error before restarting.","muted"));
            }
        }
        static string RequiredText(string name)
        { var asset=Resources.Load<TextAsset>(name); if(asset==null)throw new InvalidOperationException("Missing configuration: "+name); return asset.text; }
        void BuildDocument()
        {
            panel=panelTemplate!=null?Instantiate(panelTemplate):ScriptableObject.CreateInstance<PanelSettings>();
            panel.themeStyleSheet=Resources.Load<ThemeStyleSheet>("HarbourTheme");panel.scaleMode=PanelScaleMode.ScaleWithScreenSize; panel.referenceResolution=new Vector2Int(480,960);
            panel.screenMatchMode=PanelScreenMatchMode.MatchWidthOrHeight; panel.match=0;
            document=gameObject.AddComponent<UIDocument>(); document.panelSettings=panel;
            root=document.rootVisualElement; root.name="work4-root"; root.AddToClassList("root");
            var sheet=Resources.Load<StyleSheet>("Harbour"); if(sheet!=null)root.styleSheets.Add(sheet);
            safe=new VisualElement {name="safe-area"}; safe.AddToClassList("safe-area");root.Add(safe);
            root.RegisterCallback<GeometryChangedEvent>(_=>ApplySafeArea()); ApplySafeArea();
        }
        public static Vector4 SafeInsets(Rect area,float width,float height)
        { if(width<=0||height<=0)return Vector4.zero; return new Vector4(area.xMin/width,(height-area.yMax)/height,(width-area.xMax)/width,area.yMin/height); }
        void ApplySafeArea()
        {
            if(safe==null)return;
            var inset=SafeInsets(Screen.safeArea,Screen.width,Screen.height);
            safe.style.left=Length.Percent(inset.x*100); safe.style.top=Length.Percent(inset.y*100);
            safe.style.right=Length.Percent(inset.z*100); safe.style.bottom=Length.Percent(inset.w*100);
            lastSafe=Screen.safeArea;lastWidth=Screen.width;lastHeight=Screen.height;
        }
        void Update()
        { if(lastSafe!=Screen.safeArea||lastWidth!=Screen.width||lastHeight!=Screen.height)ApplySafeArea(); }
        public void Open(MenuScreen screen)
        {
            Navigation.Open(screen); confirmRemoval=false; safe.Clear();
            Preview.gameObject.SetActive(screen==MenuScreen.Home||screen==MenuScreen.Shipyard);
            var header=Row("header"); safe.Add(header);
            identity=Text("","identity"); header.Add(identity);
            if(screen!=MenuScreen.Home) header.Add(Button("Back","back",()=>Open(MenuScreen.Home),"home"));
            else header.Add(Button("Settings","settings",()=>Open(MenuScreen.Settings),"settings"));
            balance=Text("","resources");safe.Add(balance);
            status=Text(notice,"status");safe.Add(status);
            body=new VisualElement {name="screen-body"};body.AddToClassList("body");safe.Add(body);
            footer=new VisualElement();footer.AddToClassList("footer");safe.Add(footer);
            switch(screen)
            {
                case MenuScreen.Home: Home();break;
                case MenuScreen.Shipyard: Shipyard();break;
                case MenuScreen.Heroes: Heroes();break;
                case MenuScreen.Rewards: Rewards();break;
                case MenuScreen.Missions: Missions();break;
                case MenuScreen.Settings: Settings();break;
                case MenuScreen.Shop: Shop();break;
                case MenuScreen.Fleet: Fleet();break;
                case MenuScreen.Ranking: Info("Ranking","Online ranking is not available in this test build.");break;
            }
            RefreshHeader();
        }
        void RefreshHeader()
        {
            var p=Session.Snapshot;
            identity.text=p.displayName+"  ·  Lv "+(1+p.experience/config.experiencePerLevel);
            balance.text=$"COINS  {p.coins:N0}     GEMS  {p.gems:N0}     TROPHIES  {p.trophies:N0}";
            status.text=notice;
        }
        void Home()
        {
            var p=Session.Snapshot;
            body.Add(Text("ROYAL PIRATE","brand"));body.Add(Text(config.stageNames[p.stage-1]+"  ·  "+p.stage+" / 5","subtitle"));
            var shortcuts=Row();shortcuts.Add(Button("Fleet","ship",()=>Open(MenuScreen.Fleet),"fleet"));
            shortcuts.Add(Button("Heroes","hero",()=>Open(MenuScreen.Heroes),"heroes"));shortcuts.Add(Button("Rank","trophy",()=>Open(MenuScreen.Ranking),"ranking"));body.Add(shortcuts);
            Viewport(false);
            var chests=Row();chests.Add(Button("Chests · "+p.chests,"chest",()=>Open(MenuScreen.Rewards),"rewards"));
            chests.Add(Button("Daily mission","build",()=>Open(MenuScreen.Missions),"missions"));footer.Add(chests);
            var actions=Row();actions.Add(Button("Shipyard","build",()=>Open(MenuScreen.Shipyard),"shipyard"));
            var battle=Button("Battle","battle",LaunchBattle,"battle");battle.AddToClassList("primary");actions.Add(battle);footer.Add(actions);
            footer.Add(Button("Shop","gem",()=>Open(MenuScreen.Shop),"shop"));
            footer.Add(Text("OFFLINE TEST · provisional ship · no real currency","sandbox"));
        }
        void Viewport(bool mounts)
        {
            var viewport=new VisualElement {name="ship-viewport"};viewport.AddToClassList("viewport");body.Add(viewport);
            var hint=Text("Drag to rotate · pinch to zoom","viewport-hint");hint.pickingMode=PickingMode.Ignore;viewport.Add(hint);
            Preview.Show(Session.Snapshot,catalog,mounts); Preview.Bind(viewport);
        }
        void Shipyard()
        {
            var p=Session.Snapshot;
            body.Add(Text("SHIPYARD  ·  "+config.stageNames[p.stage-1],"title")); Viewport(true);
            var pieces=new ScrollView(ScrollViewMode.Horizontal) {name="module-strip"}; pieces.AddToClassList("module-strip");
            foreach(var mount in catalog.mounts)
            {
                string id=mount.id;var installed=p.loadout.modules.Find(m=>m.mountId==id);
                bool locked=config.UnlockStage(mount.defaultModuleId)>p.stage;
                var button=Button(Name(mount.kind)+(locked?" · Locked":installed==null?" · +":" · "+installed.level),
                    mount.kind==ModuleKind.Cannon?"battle":"build",()=>SelectMount(id),"select-"+id);
                button.EnableInClassList("selected",id==selectedMount); pieces.Add(button);
            }
            footer.Add(pieces);
            Details(); Preview.Highlight(selectedMount);
        }
        public void SelectMount(string id)
        { catalog.Mount(id); selectedMount=id; if(Navigation.Current==MenuScreen.Shipyard)Open(MenuScreen.Shipyard); }
        void Details()
        {
            var p=Session.Snapshot;var mount=catalog.Mount(selectedMount); var part=p.loadout.modules.Find(m=>m.mountId==selectedMount);
            var definition=catalog.Module(part?.definitionId??mount.defaultModuleId);
            int level=part?.level??0;bool locked=config.UnlockStage(definition.id)>p.stage,maximum=level>=definition.maxLevel;
            long cost=level==0?definition.baseCost:definition.UpgradeCost(level);
            var details=new VisualElement();details.AddToClassList("card");footer.Add(details);
            details.Add(Text(Name(mount.kind)+"   "+(level==0?"Empty mount":"Level "+level),"title"));
            details.Add(Text($"Resistance  {(level==0?0:definition.HealthAt(level))} → {(maximum?definition.HealthAt(level):definition.HealthAt(level+1))}   ·   Attack {definition.damage}","comparison"));
            if(locked)details.Add(Text("Unlocks at ship stage "+config.UnlockStage(definition.id),"muted"));
            var row=Row();var build=Button(maximum?"Max level":(level==0?"Build":"Upgrade")+" · "+cost,"build",()=>Act(()=>Session.BuildOrUpgrade(selectedMount,Session.Snapshot.revision,DateTime.UtcNow)),"build-upgrade");
            build.AddToClassList("primary");build.SetEnabled(!locked&&!maximum&&p.coins>=cost);row.Add(build);
            if(part!=null&&mount.kind!=ModuleKind.Hull)
                row.Add(Button("Remove","back",()=>ConfirmRemove(),"remove"));
            details.Add(row);
            if(p.stage<5)
            {
                int stageCost=config.stageCosts[p.stage-1];
                var evolve=Button("Stage "+(p.stage+1)+" · "+stageCost,"ship",()=>Act(()=>Session.Evolve(Session.Snapshot.revision)),"evolve");
                evolve.SetEnabled(p.coins>=stageCost);details.Add(evolve);
            }
            details.Add(Text("Saved after each change · removal gives no refund","muted"));
        }
        void ConfirmRemove()
        {
            if(confirmRemoval) { Act(()=>Session.Remove(selectedMount,Session.Snapshot.revision));return; }
            confirmRemoval=true; notice="Tap Confirm removal. The piece and its levels will be lost, with no refund.";status.text=notice;
            var b=footer.Q<Button>("remove");b.Q<Label>().text="Confirm removal";
        }
        ScrollView Scroll(string title)
        { body.Add(Text(title,"title"));var view=new ScrollView();view.AddToClassList("page-scroll");body.Add(view);return view; }
        void Heroes()
        {
            var list=Scroll("CREW");var p=Session.Snapshot;
            foreach(var d in config.heroes)
            {
                var card=new VisualElement();card.AddToClassList("card");list.Add(card);
                card.Add(Text(d.name+" · "+d.heroClass,"title"));
                var hero=p.heroes.Find(h=>h.id==d.id);
                card.Add(Text(d.rarity+" · Ability: "+d.abilityId.Replace("ability.",""),"muted"));
                if(hero==null) {card.Add(Text("Unlocks at ship stage "+d.unlockStage,"muted"));continue;}
                card.Add(Text($"Level {hero.level} · XP {hero.experience}/{d.baseExperience*hero.level}","comparison"));
                var slot=catalog.mounts.FirstOrDefault(m=>m.kind==ModuleKind.HeroSlot&&p.loadout.modules.Exists(x=>x.mountId==m.id));
                string id=hero.id;bool equipped=!string.IsNullOrEmpty(hero.mountId);
                var equip=Button(equipped?"Unequip":"Equip","hero",()=>Act(()=>Session.Equip(id,equipped?null:slot?.id,Session.Snapshot.revision)),"equip-"+id);
                equip.SetEnabled(equipped||slot!=null);card.Add(equip);
                if(slot==null)card.Add(Text("Build a hero position in the shipyard.","muted"));
                var upgrade=Button("Upgrade · "+((long)d.baseCost*hero.level),"build",()=>Act(()=>Session.UpgradeHero(id,Session.Snapshot.revision)),"upgrade-"+id);
                upgrade.SetEnabled(hero.level<d.maxLevel&&p.coins>=(long)d.baseCost*hero.level&&hero.experience>=d.baseExperience*hero.level);card.Add(upgrade);
            }
            footer.Add(Text("Special abilities are not available in this test build.","muted"));
        }
        void Rewards()
        {
            var list=Scroll("TREASURE");var p=Session.Snapshot;
            list.Add(Text("Local test rewards","subtitle"));
            RewardLine(list,config.Reward("welcome"));
            var welcome=Button("Welcome chest","chest",()=>Act(()=>Session.ClaimWelcome(Session.Snapshot.revision)),"claim-welcome");
            welcome.SetEnabled(!p.claimedRewards.Contains("welcome"));list.Add(welcome);
            RewardLine(list,config.Reward("chest.basic"));
            var chest=Button("Open chest · "+p.chests,"chest",()=>Act(()=>Session.OpenChest(Session.Snapshot.revision)),"open-chest");chest.SetEnabled(p.chests>0);list.Add(chest);
        }
        void Missions()
        {
            var list=Scroll("DAILY MISSION");var p=Session.Snapshot;string today=DateTime.UtcNow.ToString("yyyy-MM-dd");
            list.Add(Text("Build or improve one ship component.","subtitle"));
            bool complete=p.lastDailyDay==today&&p.dailyBuilds>0;
            list.Add(Text(complete?"Completed · 1 / 1":"Progress · 0 / 1","comparison"));RewardLine(list,config.Reward("daily.build"));
            var claim=Button("Claim reward","chest",()=>Act(()=>Session.ClaimDaily(Session.Snapshot.revision,DateTime.UtcNow)),"claim-daily");
            claim.SetEnabled(complete&&!p.claimedRewards.Contains("daily."+today));list.Add(claim);
            list.Add(Text("Resets daily at 00:00 UTC. Offline test.","muted"));
        }
        static void RewardLine(VisualElement parent,RewardDefinition r)
        {parent.Add(Text($"{r.coins} coins · {r.gems} gems · {r.experience} XP · {r.chests} chests","comparison"));}
        void Fleet()
        {
            var list=Scroll("FLEET · 24 SHIPS PLANNED");
            foreach(var ship in config.ships)
            {
                var card=new VisualElement();card.AddToClassList("card");list.Add(card);
                card.Add(Text(ship.name+" · "+ship.shipClass,"title"));
                card.Add(Text(ship.available?"Available · 5 evolution stages":$"Planned · {ship.unlockTrophies} trophies · not playable yet","muted"));
            }
        }
        void Shop()
        {
            var list=Scroll("SHOP");list.Add(Text("Preview · payments disabled","subtitle"));
            foreach(var name in new[]{"Gems","Coin packs","Ship skins","Cosmetics","Special offers","Rewarded ad"})
            { var button=Button(name,"gem",()=>{},"offer-"+name);button.SetEnabled(false);list.Add(button); }
            list.Add(Text("Purchases and rewarded ads are not available in this test build.","muted"));
        }
        void Settings()
        {
            var list=Scroll("SETTINGS");var p=Session.Snapshot;
            list.Add(Text("Guest · saved on this device","subtitle"));list.Add(Text(p.playerId,"muted"));
            var sound=new Toggle("Sound") {value=p.sound};sound.name="sound";sound.RegisterValueChangedCallback(e=>Act(()=>Session.SetSound(e.newValue,Session.Snapshot.revision)));list.Add(sound);
            foreach(var name in new[]{"Link Apple","Link Google","Recover cloud progress"})
            { var button=Button(name,"hero",()=>{},name);button.SetEnabled(false);list.Add(button); }
            list.Add(Text("Cloud recovery is not available. Keep this device’s data to retain your progress.","muted"));
        }
        void Info(string title,string message) { var view=Scroll(title);view.Add(Text(message,"subtitle")); }
        void Act(Func<bool> action)
        {
            try { notice=action()?"Progress saved.":"Action unavailable. No coins spent.";AudioListener.volume=Session.Snapshot.sound?1:0; }
            catch(Exception e) { notice="Not saved: "+e.Message;Debug.LogException(e); }
            Open(Navigation.Current);
        }
        void LaunchBattle()
        {
            try
            {
                var loadout=Session.BattleLoadout();
                if(!loadout.modules.Exists(m=>catalog.Module(m.definitionId).kind==ModuleKind.Cannon)) { notice="Build a cannon before battle.";RefreshHeader();return; }
                if(!Application.CanStreamedLevelBeLoaded("Integration")) { notice="Battle scene is not in Build Settings. Run Prepare Work 4.";RefreshHeader();return; }
                // Existing Work 1 integration harness consumes exactly this IProgressStore projection.
                // It is deliberately not the authority for the wallet / player aggregate.
                IProgressStore battleStore=new LocalLoadoutStore(Application.persistentDataPath,catalog);battleStore.Save(loadout);
                var returnObject=new GameObject("ReturnToHarbour");returnObject.AddComponent<BattleReturnButton>();
                SceneManager.LoadScene("Integration");
            }
            catch(Exception e) { notice="Battle unavailable: "+e.Message;RefreshHeader();Debug.LogException(e); }
        }
        static string Name(ModuleKind kind)=>kind==ModuleKind.HeroSlot?"Hero slot":kind.ToString();
        static VisualElement Row(string className="row") {var row=new VisualElement();row.AddToClassList("row");if(className!="row")row.AddToClassList(className);return row;}
        static Label Text(string text,string cls) {var label=new Label(text);label.AddToClassList(cls);return label;}
        static Button Button(string text,string icon,Action action,string name)
        { var b=new Button(action){name=name};b.AddToClassList("action");b.Add(new PirateIcon(icon));b.Add(new Label(text){pickingMode=PickingMode.Ignore});return b; }
        void OnDestroy() {if(panel!=null)Destroy(panel);}
    }
}

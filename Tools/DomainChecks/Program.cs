using System;
using System.IO;
using System.Text.Json;
using RoyalPirate.Domain;

// Executes the exact production domain sources without Unity or any NuGet dependencies.
internal static class Program
{
    static int count;
    static void Check(bool condition, string name)
    { if (!condition) throw new Exception(name); count++; Console.WriteLine("PASS " + name); }
    static void Reject(Action action, string name)
    {
        try { action(); } catch (ArgumentException) { Check(true,name); return; }
        throw new Exception("Expected rejection: " + name);
    }
    public static void Main(string[] args)
    {
        var catalog = JsonSerializer.Deserialize<ShipCatalog>(File.ReadAllText(args[0]),new JsonSerializerOptions {IncludeFields=true});
        catalog.Validate();
        var p=new Vec3(0,10,0); var v=new Vec3(0,10,20);
        for(int i=0;i<50;i++) Ballistics.Step(ref p,ref v,new Vec3(),.02f);
        Check(Math.Abs(p.y-15.095)<.001 && Math.Abs(p.z-20)<.001,"gravity / analytic reference");
        p=new Vec3();v=new Vec3();
        for(int i=0;i<100;i++) Ballistics.Step(ref p,ref v,new Vec3(2,0,0),.02f);
        Check(Math.Abs(p.x-4)<.001,"wind / analytic reference");
        Reject(()=>Ballistics.LaunchVelocity(0,30,float.NaN),"NaN power rejected");
        Reject(()=>Ballistics.LaunchVelocity(0,30,2),"out-of-range power rejected");
        var health=new ModuleState("module",100); int events=0; health.Destroyed+=_=>events++;
        Check(health.ApplyDamage(int.MaxValue)==100,"overkill clamps"); health.ApplyDamage(1);
        Check(health.Health==0 && events==1,"destruction emitted once");
        Reject(()=>health.ApplyDamage(-1),"negative damage rejected");
        var loadout=ShipLoadout.CreateStarter(catalog);
        Check(loadout.modules.Count==10,"starter covers 10 component categories");
        var yard=new SandboxShipyard(catalog,loadout,1000); string id=loadout.modules[0].instanceId;
        Check(yard.Upgrade(id,0)&&!yard.Upgrade(id,0)&&yard.Coins==900,"upgrade charge / stale revision");
        yard=new SandboxShipyard(catalog,loadout,0);
        Check(!yard.Upgrade(id,1)&&loadout.revision==1,"insufficient funds atomicity");
        loadout.modules[1].instanceId=id;
        Reject(()=>loadout.Validate(catalog),"duplicate instance rejected");
        loadout=ShipLoadout.CreateStarter(catalog);loadout.modules[1].definitionId="module.cannon.01";
        Reject(()=>loadout.Validate(catalog),"incompatible module rejected");
        loadout=ShipLoadout.CreateStarter(catalog);loadout.modules.RemoveAll(x=>x.mountId=="mount.sail.01");
        yard=new SandboxShipyard(catalog,loadout,500);
        Check(!yard.Install("module.cannon.01","mount.sail.01",0)&&yard.Coins==500,"invalid construction free of mutations");
        Check(yard.Install("module.sail.01","mount.sail.01",0)&&yard.Coins==400,"valid construction costs once");
        Check(!yard.Install("module.sail.01","mount.sail.01",1)&&yard.Coins==400,"occupied mount rejected");
        loadout.Validate(catalog);
        var turn=new TurnState(); Check(!turn.TryFire(1)&&turn.TryFire(0)&&!turn.TryFire(0),"turn ownership / double fire");
        turn.ResolveShot(turn.TurnNumber);Check(turn.ActivePlayer==1,"resolution passes turn");
        turn.Tick(20);Check(turn.ActivePlayer==0,"timer passes turn");
        turn.Finish();turn.Tick(100);Check(turn.Phase==BattlePhase.Finished&&!turn.TryFire(0),"finished battle stays finished");
        // Independent serialization check, not a substitute for Unity JsonUtility / file-store tests.
        var options=new JsonSerializerOptions {IncludeFields=true};
        var copy=JsonSerializer.Deserialize<ShipLoadout>(JsonSerializer.Serialize(loadout,options),options);
        copy.Validate(catalog);Check(copy.modules[0].instanceId==loadout.modules[0].instanceId,"domain DTO roundtrip (System.Text.Json)");
        copy.modules[0].level=catalog.Module(copy.modules[0].definitionId).maxLevel;
        yard=new SandboxShipyard(catalog,copy,1000000);
        Check(!yard.Upgrade(copy.modules[0].instanceId,copy.revision)&&yard.Coins==1000000,"max level rejects without charge");
        copy.revision=long.MaxValue;
        Check(!yard.Upgrade(copy.modules[1].instanceId,long.MaxValue),"revision overflow rejected");
        copy=ShipLoadout.CreateStarter(catalog); copy.modules.RemoveAt(0);
        Reject(()=>copy.Validate(catalog),"missing structural hull rejected");
        copy=ShipLoadout.CreateStarter(catalog); copy.schemaVersion=2;
        Reject(()=>copy.Validate(catalog),"future schema rejected");
        turn=new TurnState();turn.TryFire(0);int expiredTurn=turn.TurnNumber;
        turn.Tick(8);turn.TryFire(1);turn.ResolveShot(expiredTurn);
        Check(turn.ActivePlayer==1&&turn.Phase==BattlePhase.Resolving,"late resolution cannot skip a new turn");
        foreach(var test in RoyalPirate.Tests.CombatContractChecks.Names)
        { RoyalPirate.Tests.CombatContractChecks.Run(test); Check(true,"combat / "+test); }
        Console.WriteLine($"RESULT: {count} checks passed. Unity compilation, collisions and device tests NOT run.");
    }
}

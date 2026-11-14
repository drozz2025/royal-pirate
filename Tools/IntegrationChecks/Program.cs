using System;
using System.IO;
using System.Text.Json;
using RoyalPirate.Domain;
using RoyalPirate.Services;
sealed class Codec : ILoadoutCodec
{
    public static readonly JsonSerializerOptions Options=new JsonSerializerOptions {IncludeFields=true};
    public string Encode(ShipLoadout value)=>JsonSerializer.Serialize(value,Options);
    public ShipLoadout Decode(string text)
    {try{return JsonSerializer.Deserialize<ShipLoadout>(text,Options);}catch(JsonException e){throw new FormatException("Invalid JSON",e);}}
}
static class Program
{
    static int passed;
    static void Check(bool ok,string name){if(!ok)throw new Exception(name);Console.WriteLine("PASS "+name);passed++;}
    static void Invalid(Action action,string name)
    {bool failed=false;try{action();}catch(InvalidDataException){failed=true;}Check(failed,name);}
    static void Main(string[] args)
    {
        var catalog=JsonSerializer.Deserialize<ShipCatalog>(File.ReadAllText(args[0]),Codec.Options);
        var dir=Path.Combine(Path.GetTempPath(),"royal-integration-"+Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);var path=Path.Combine(dir,"loadout-v1.json");
        var codec=new Codec();var store=new LoadoutFileStore(dir,catalog,codec);
        try
        {
            Check(store.Load()==null,"fresh install has no projection");
            var value=ShipLoadout.CreateStarter(catalog);store.Save(value);
            value.revision=1;store.Save(value);File.Delete(path);
            Check(store.Load().revision==0,"W5R02 missing primary recovers valid backup");
            store.Save(value);File.WriteAllText(path,"{}");var recovered=store.Load();store.Save(recovered);
            File.WriteAllText(path,"{}");Check(store.Load().revision==0,"W5R03 repair retains good backup");
            Check(Directory.GetFiles(dir,"*.corrupt.*").Length==1,"corrupt primary preserved separately");
            File.WriteAllText(path,new string('x',65537));Check(store.Load().revision==0,"oversized primary uses backup");
            File.WriteAllText(path,"{truncated");Check(store.Load().revision==0,"malformed JSON uses backup");
            File.WriteAllText(path+".bak","{}");Invalid(()=>store.Load(),"two corrupt generations fail visibly");
            store.Save(value);var before=File.ReadAllText(path);value.modules[0].level=0;
            bool rejected=false;try{store.Save(value);}catch(ArgumentException){rejected=true;}
            Check(rejected && File.ReadAllText(path)==before,"invalid loadout cannot replace primary");
            value.modules[0].level=1;File.WriteAllText(path+".tmp","{truncated");
            Check(store.Load().revision==1,"temporary file cannot override valid primary");
            File.Delete(path);File.Delete(path+".bak");Invalid(()=>store.Load(),"interrupted first write is not silently reset");
            File.Delete(path+".tmp");store.Save(value);value.revision=2;value.modules[0].level=2;store.Save(value);
            var next=new LoadoutFileStore(dir,catalog,codec).Load();
            Check(next.revision==2 && next.modules[0].level==2,"shipyard projection survives battle store reload");
            Check(codec.Decode(File.ReadAllText(path+".bak")).revision==1,"normal save rotates previous valid generation");
            Console.WriteLine($"RESULT: {passed} integration persistence checks passed. Production transaction code; System.Text.Json codec. Unity JsonUtility NOT executed.");
        }
        finally{Directory.Delete(dir,true);}
    }
}

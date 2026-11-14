using System;
using System.IO;
using System.Text.Json;
using RoyalPirate.Domain;
using RoyalPirate.Progression;
using RoyalPirate.Work4Tests;
sealed class Codec : IProgressCodec
{
    static readonly JsonSerializerOptions Options=new JsonSerializerOptions {IncludeFields=true};
    public string Encode(PlayerProgress p)=>JsonSerializer.Serialize(p,Options);
    public PlayerProgress Decode(string text)
    {try{return JsonSerializer.Deserialize<PlayerProgress>(text,Options);}catch(JsonException e){throw new FormatException("Invalid JSON",e);}}
}
static class Program
{
    static void Main(string[] args)
    {
        var options=new JsonSerializerOptions {IncludeFields=true};
        var catalog=JsonSerializer.Deserialize<ShipCatalog>(File.ReadAllText(args[0]),options);
        var config=JsonSerializer.Deserialize<EconomyConfig>(File.ReadAllText(args[1]),options);
        string path=Path.Combine(Path.GetTempPath(),"royal-work4-"+Guid.NewGuid().ToString("N"));
        try {int n=Work4Scenarios.Run(catalog,config,new Codec(),path,Console.WriteLine);Console.WriteLine($"RESULT: {n} checks passed, including 5000 transactions. Actual domain/store sources. System.Text.Json codec; Unity not executed.");}
        finally {if(Directory.Exists(path))Directory.Delete(path,true);}
    }
}

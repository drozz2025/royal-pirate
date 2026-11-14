using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using RoyalPirate.Domain;
using RoyalPirate.QA;

internal static class Program
{
    static int Main(string[] args)
    {
        if(args.Length!=2){Console.Error.WriteLine("Usage: QA <catalog.json> <report.json>");return 2;}
        var results=new List<object>();int failed=0,passed=0;
        foreach(var name in DomainScenarios.Names)
        {
            var timer=Stopwatch.StartNew();string error=null;
            try
            {
                var catalog=JsonSerializer.Deserialize<ShipCatalog>(File.ReadAllText(args[0]),new JsonSerializerOptions{IncludeFields=true});
                DomainScenarios.Run(name,catalog);passed++;
            }
            catch(Exception e){failed++;error=e.ToString();}
            timer.Stop();Console.WriteLine((error==null?"PASS ":"FAIL ")+name+(error==null?"":" "+error));
            results.Add(new{name,passed=error==null,milliseconds=timer.Elapsed.TotalMilliseconds,error});
        }
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(args[1])));
        File.WriteAllText(args[1],JsonSerializer.Serialize(new{
            suite="production-domain-source-regressions",runtime=Environment.Version.ToString(),passed,failed,
            unityExecuted=false,deviceExecuted=false,fullBattleSimulation=false,
            economySequences=1000,economyOperations=60000,turnTransitions=1000,results
        },new JsonSerializerOptions{WriteIndented=true}));
        Console.WriteLine($"RESULT: {passed} passed; {failed} failed. Unity/device/full-battle tests NOT executed.");
        return failed==0?0:1;
    }
}

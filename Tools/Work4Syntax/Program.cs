using System;
using System.IO;
using System.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
int count=0,errors=0;
foreach(string file in Directory.GetFiles(args[0],"*.cs",SearchOption.AllDirectories))
{
    var tree=CSharpSyntaxTree.ParseText(File.ReadAllText(file),new CSharpParseOptions(LanguageVersion.CSharp9),file);
    foreach(var diagnostic in tree.GetDiagnostics().Where(d=>d.Severity==DiagnosticSeverity.Error)) {Console.WriteLine(diagnostic);errors++;}
    count++;
}
Console.WriteLine($"RESULT: {count} C# files parsed; {errors} syntax errors. Syntax only: not Unity API/assembly compilation.");
Environment.ExitCode=errors==0?0:1;

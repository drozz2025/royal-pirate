using System;
using System.IO;
using System.Text;
using RoyalPirate.Domain;

namespace RoyalPirate.Progression
{
    // Versioned local sandbox only. Atomic same-filesystem replacement and two validated generations.
    // Unknown schemas block writes; corruption is preserved for diagnosis, never silently reset.
    public sealed class AtomicProgressStore : IPlayerProgressStore
    {
        public const int MaximumBytes = 128 * 1024;
        public string PathName { get; }
        public bool RecoveredBackup { get; private set; }
        readonly IProgressCodec codec;
        readonly ShipCatalog catalog;
        readonly EconomyConfig config;
        public AtomicProgressStore(string directory,IProgressCodec codec,ShipCatalog catalog,EconomyConfig config)
        {
            if (string.IsNullOrWhiteSpace(directory)) throw new ArgumentException(nameof(directory));
            this.codec=codec; this.catalog=catalog; this.config=config;
            PathName=Path.Combine(directory,"work4-progress-v1.json");
        }
        public PlayerProgress Load()
        {
            RecoveredBackup=false;
            if (File.Exists(PathName))
            {
                try { return Read(PathName); }
                catch (FutureProgressVersionException) { throw; }
                catch (Exception e) when (e is InvalidDataException || e is ArgumentException || e is IOException)
                { if (!File.Exists(PathName+".bak")) throw new InvalidDataException("Progress cannot be read; file retained.",e); }
            }
            if (File.Exists(PathName+".bak")) { var result=Read(PathName+".bak"); RecoveredBackup=true; return result; }
            if (File.Exists(PathName+".tmp")) throw new InvalidDataException("Interrupted first save; temporary file retained.");
            return null;
        }
        PlayerProgress Read(string path)
        {
            if (new FileInfo(path).Length > MaximumBytes) throw new InvalidDataException("Progress too large.");
            PlayerProgress value;
            try { value=codec.Decode(File.ReadAllText(path,Encoding.UTF8)); }
            catch (Exception e) when (e is ArgumentException || e is FormatException) { throw new InvalidDataException("Invalid JSON.",e); }
            if (value==null) throw new InvalidDataException("Empty progress.");
            if (value.schemaVersion>1) throw new FutureProgressVersionException();
            value.Validate(catalog,config); return value;
        }
        public void Save(PlayerProgress value)
        {
            value.Validate(catalog,config);
            byte[] bytes=new UTF8Encoding(false).GetBytes(codec.Encode(value));
            if (bytes.Length>MaximumBytes) throw new InvalidDataException("Progress too large.");
            Directory.CreateDirectory(Path.GetDirectoryName(PathName));
            // Check current generation before touching disk; prevents overwriting a future schema.
            bool validPrimary=false;
            if (File.Exists(PathName))
            {
                try { Read(PathName); validPrimary=true; }
                catch (FutureProgressVersionException) { throw; }
                catch (Exception e) when (e is InvalidDataException || e is ArgumentException || e is IOException)
                { if (!RecoveredBackup) throw new InvalidDataException("Refusing to overwrite unverified progress.",e); }
            }
            using (var stream=new FileStream(PathName+".tmp",FileMode.Create,FileAccess.Write,FileShare.None))
            { stream.Write(bytes,0,bytes.Length); stream.Flush(true); }
            Read(PathName+".tmp");
            if (File.Exists(PathName))
                File.Replace(PathName+".tmp",PathName,validPrimary ? PathName+".bak" : PathName+".corrupt."+Guid.NewGuid().ToString("N"));
            else File.Move(PathName+".tmp",PathName);
            RecoveredBackup=false;
        }
    }
    public sealed class FutureProgressVersionException : Exception
    { public FutureProgressVersionException() : base("This progress requires a newer game version. No files were replaced.") { } }
}

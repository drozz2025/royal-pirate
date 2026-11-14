using System;
using System.IO;
using System.Text;
using RoyalPirate.Domain;

namespace RoyalPirate.Services
{
    public interface ILoadoutCodec
    {
        string Encode(ShipLoadout value);
        ShipLoadout Decode(string text);
    }
    // Actual file transaction logic, shared by Unity and the independent .NET checks.
    public sealed class LoadoutFileStore : IProgressStore
    {
        readonly string path;
        readonly ShipCatalog catalog;
        readonly ILoadoutCodec codec;
        const int MaximumBytes = 64 * 1024;
        public LoadoutFileStore(string directory, ShipCatalog catalog, ILoadoutCodec codec)
        {
            if (string.IsNullOrWhiteSpace(directory)) throw new ArgumentException(nameof(directory));
            this.catalog = catalog ?? throw new ArgumentNullException(nameof(catalog)); catalog.Validate();
            this.codec = codec ?? throw new ArgumentNullException(nameof(codec));
            path = Path.Combine(directory, "loadout-v1.json");
        }
        public void Save(ShipLoadout loadout)
        {
            loadout.Validate(catalog);
            byte[] bytes = new UTF8Encoding(false).GetBytes(codec.Encode(loadout));
            if (bytes.Length > MaximumBytes) throw new InvalidDataException("Save too large.");
            bool validPrimary = false;
            if (File.Exists(path))
            {
                try { Read(path); validPrimary = true; }
                catch (Exception e) when (e is ArgumentException || e is InvalidDataException)
                { /* Keep corrupt data separately; never rotate it over a valid backup. */ }
            }
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            string temporary = path + ".tmp";
            using (var stream = new FileStream(temporary, FileMode.Create, FileAccess.Write, FileShare.None))
            { stream.Write(bytes, 0, bytes.Length); stream.Flush(true); }
            Read(temporary);
            if (File.Exists(path))
                File.Replace(temporary, path, validPrimary ? path + ".bak" : path + ".corrupt." + Guid.NewGuid().ToString("N"));
            else File.Move(temporary, path);
        }
        public ShipLoadout Load()
        {
            if (File.Exists(path))
            {
                try { return Read(path); }
                catch (Exception e) when (e is ArgumentException || e is InvalidDataException)
                {
                    if (File.Exists(path + ".bak")) return Read(path + ".bak");
                    throw new InvalidDataException("Invalid save; retained for diagnosis.", e);
                }
            }
            if (File.Exists(path + ".bak")) return Read(path + ".bak");
            if (File.Exists(path + ".tmp")) throw new InvalidDataException("Interrupted first save; temporary file retained.");
            return null;
        }
        ShipLoadout Read(string source)
        {
            if (new FileInfo(source).Length > MaximumBytes) throw new InvalidDataException("Save too large.");
            ShipLoadout value;
            try { value = codec.Decode(File.ReadAllText(source)); }
            catch (Exception e) when (e is ArgumentException || e is FormatException)
            { throw new InvalidDataException("Invalid JSON.", e); }
            if (value == null) throw new InvalidDataException("Empty save.");
            try { value.Validate(catalog); }
            catch (ArgumentException e) { throw new InvalidDataException("Invalid loadout.", e); }
            return value;
        }
    }
}

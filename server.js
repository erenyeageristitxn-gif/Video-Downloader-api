const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// root check
app.get("/", (req, res) => {
  res.send("VideoGrab API running 🚀");
});

// ================= API =================
app.get("/api", (req, res) => {
  const url = req.query.url;
  if (!url) return res.json({ error: "No URL provided" });

  const cmd = `yt-dlp -j "${url}"`;

  exec(cmd, { maxBuffer: 1024 * 1024 * 15 }, (err, stdout) => {
    if (err) {
      return res.json({ error: "yt-dlp failed", details: err.message });
    }

    try {
      const data = JSON.parse(stdout);

      // ✅ ONLY CLEAN RESOLUTIONS
      let formats = data.formats
        .filter(f => f.ext === "mp4" && f.height)
        .map(f => ({
          quality: f.height + "p",
          format_id: f.format_id
        }));

      // ✅ REMOVE DUPLICATES
      const seen = new Set();
      formats = formats.filter(f => {
        if (seen.has(f.quality)) return false;
        seen.add(f.quality);
        return true;
      });

      // ✅ SORT LOW → HIGH
      formats.sort((a, b) => parseInt(a.quality) - parseInt(b.quality));

      res.json({
        title: data.title,
        thumbnail: data.thumbnail,
        formats
      });

    } catch {
      res.json({ error: "Parse error" });
    }
  });
});

// ================= DOWNLOAD =================
app.get("/download", (req, res) => {
  const { url, format } = req.query;
  if (!url || !format) return res.send("Missing params");

  // ✅ merge video + audio (fix 0MB issue)
  const cmd = `yt-dlp -f ${format}+bestaudio -o - "${url}"`;

  const process = exec(cmd, { maxBuffer: 1024 * 1024 * 100 });

  res.setHeader("Content-Disposition", "attachment; filename=video.mp4");
  res.setHeader("Content-Type", "video/mp4");

  process.stdout.pipe(res);

  process.stderr.on("data", (d) => {
    console.log("yt-dlp:", d.toString());
  });
});

app.listen(PORT, () => console.log("Server running on port", PORT));

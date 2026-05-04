const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// ROOT
app.get("/", (req, res) => {
  res.send("FB & Insta Downloader API 🚀");
});

// ================= API =================
app.get("/api", (req, res) => {
  const url = req.query.url;
  if (!url) return res.json({ error: "No URL" });

  exec(`yt-dlp -j "${url}"`, { maxBuffer: 1024 * 1024 * 20 }, (err, stdout) => {
    if (err) return res.json({ error: "yt-dlp failed" });

    try {
      const data = JSON.parse(stdout);

      // 🔥 SMART FORMAT DETECTION (FB + INSTA)
      let formats = data.formats
        .filter(f => f.vcodec !== "none") // video only
        .map(f => ({
          quality: f.height
            ? f.height + "p"
            : (f.format_note || f.format_id || "Auto"),
          format_id: f.format_id,
          height: f.height || 0
        }));

      // 🔥 remove duplicates
      const map = new Map();
      formats.forEach(f => {
        if (!map.has(f.quality)) {
          map.set(f.quality, f);
        }
      });
      formats = Array.from(map.values());

      // 🔥 sort
      formats.sort((a, b) => a.height - b.height);

      // 🔥 agar sirf 1 hi hai
      if (formats.length === 1) {
        formats[0].quality = "Best Quality";
      }

      res.json({
        title: data.title,
        thumbnail: data.thumbnail,
        formats
      });

    } catch {
      res.json({ error: "parse error" });
    }
  });
});

// ================= DOWNLOAD =================
app.get("/download", (req, res) => {
  const { url, format } = req.query;
  if (!url || !format) return res.send("Missing params");

  const file = `video_${Date.now()}.mp4`;

  // 🔥 BEST MERGE LOGIC (fixes play issue + quality)
  const cmd = `yt-dlp -f ${format}+bestaudio/best "${url}" -o "${file}"`;

  exec(cmd, (err) => {
    if (err) return res.send("Download failed");

    res.download(file, () => {
      fs.unlink(file, () => {});
    });
  });
});

app.listen(PORT, () => console.log("Server running"));

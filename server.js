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

  const cmd = `yt-dlp -j "${url}"`;

  exec(cmd, { maxBuffer: 1024 * 1024 * 20 }, (err, stdout) => {
    if (err) {
      return res.json({ error: "yt-dlp failed" });
    }

    try {
      const data = JSON.parse(stdout);

      // 🔥 FB/INSTA: keep only real playable mp4 formats
      let formats = data.formats
        .filter(f =>
          f.ext === "mp4" &&
          f.vcodec !== "none" &&
          f.acodec !== "none"
        )
        .map(f => ({
          quality: f.height ? f.height + "p" : "Auto",
          format_id: f.format_id,
          filesize: f.filesize || 0
        }));

      // remove duplicates
      const seen = new Set();
      formats = formats.filter(f => {
        if (seen.has(f.quality)) return false;
        seen.add(f.quality);
        return true;
      });

      // sort
      formats.sort((a, b) => parseInt(a.quality) - parseInt(b.quality));

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

  // 🔥 FB/INSTA SAFE DOWNLOAD (no pipe)
  const cmd = `yt-dlp -f ${format} "${url}" -o "${file}"`;

  exec(cmd, (err) => {
    if (err) return res.send("Download failed");

    res.download(file, () => {
      fs.unlink(file, () => {});
    });
  });
});

app.listen(PORT, () => console.log("Server running"));

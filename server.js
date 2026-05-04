const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
app.use(cors());

function run(cmd, cb){
  exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, cb);
}

// ✅ API
app.get("/api", (req, res) => {
  const url = req.query.url;
  if (!url) return res.json({ error: "No URL" });

  // JSON try
  const cmd = `yt-dlp -J --no-playlist --no-warnings "${url}"`;

  run(cmd, (err, stdout) => {

    if (!err && stdout) {
      try {
        const data = JSON.parse(stdout);

        let formats = [];

        if (data.formats) {
          formats = data.formats
            .filter(f => f.ext === "mp4" && f.height)
            .map(f => ({
              quality: f.height + "p",
              format_id: f.format_id
            }))
            .sort((a,b)=>parseInt(b.quality)-parseInt(a.quality))
            .slice(0,5);
        }

        // fallback
        if (formats.length === 0 && data.url) {
          return res.json({
            title: data.title,
            thumbnail: data.thumbnail,
            formats: [{ quality: "Auto", format_id: "direct" }],
            direct: data.url
          });
        }

        if (formats.length > 0) {
          return res.json({
            title: data.title,
            thumbnail: data.thumbnail,
            formats
          });
        }

      } catch {}
    }

    // 🔥 fallback 2 (important)
    const cmd2 = `yt-dlp -g "${url}"`;
    run(cmd2, (e2, out2) => {
      if (e2 || !out2) {
        return res.json({ error: "Fetch failed" });
      }

      return res.json({
        title: "Video",
        thumbnail: "",
        formats: [{ quality: "Auto", format_id: "direct" }],
        direct: out2.trim()
      });
    });

  });
});

// ✅ DOWNLOAD
app.get("/download", (req, res) => {
  const { url, format, direct } = req.query;

  // direct case
  if (format === "direct" && direct) {
    return res.redirect(direct);
  }

  const cmd = `yt-dlp -f ${format} -o - "${url}"`;
  const p = exec(cmd);

  res.setHeader("Content-Disposition", "attachment; filename=video.mp4");
  res.setHeader("Content-Type", "video/mp4");

  p.stdout.pipe(res);
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);

const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
app.use(cors());

function run(cmd, cb){
  exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, cb);
}

// ROOT
app.get("/", (req, res) => {
  res.send("VideoGrab API Running");
});

// API
app.get("/api", (req, res) => {
  const url = req.query.url;
  if (!url) return res.json({ error: "No URL" });

  run(`yt-dlp -J "${url}"`, (err, stdout) => {

    if (!err && stdout) {
      try {
        const data = JSON.parse(stdout);

        let formats = data.formats
          .filter(f => f.ext === "mp4" && f.height && f.vcodec !== "none")
          .map(f => ({
            quality: f.height + "p",
            format_id: f.format_id
          }));

        // remove duplicates
        const seen = new Set();
        formats = formats.filter(f => {
          if (seen.has(f.quality)) return false;
          seen.add(f.quality);
          return true;
        });

        formats.sort((a,b)=>parseInt(b.quality)-parseInt(a.quality));
        formats = formats.slice(0,5);

        return res.json({
          title: data.title,
          thumbnail: data.thumbnail,
          uploader: data.uploader,
          views: data.view_count,
          formats
        });

      } catch {}
    }

    // fallback
    run(`yt-dlp -g "${url}"`, (e2, out2) => {
      if (!out2) return res.json({ error: "Failed" });

      res.json({
        title: "Video",
        thumbnail: "",
        formats: [{ quality: "Auto", format_id: "direct" }],
        direct: out2.trim()
      });
    });

  });
});

// DOWNLOAD
app.get("/download", (req, res) => {
  const { url, format, direct } = req.query;

  if (format === "direct" && direct) {
    return res.redirect(direct);
  }

  const cmd = `yt-dlp -f ${format}+bestaudio --merge-output-format mp4 -o - "${url}"`;
  const p = exec(cmd);

  res.setHeader("Content-Disposition", "attachment; filename=video.mp4");
  res.setHeader("Content-Type", "video/mp4");

  p.stdout.pipe(res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running " + PORT));

const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
app.use(cors());

// TEST
app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

// VIDEO INFO
app.get("/api", (req, res) => {
  const url = req.query.url;

  if (!url) return res.json({ error: "No URL provided" });

  exec(`python3 -m yt_dlp -J "${url}"`, (err, stdout, stderr) => {
    if (err) {
      return res.json({
        error: "yt-dlp failed",
        details: stderr
      });
    }

    try {
      const data = JSON.parse(stdout);

      const formats = data.formats
        .filter(f => f.ext === "mp4" && f.format_id)
        .slice(-6)
        .map(f => ({
          quality: f.format_note || (f.height ? f.height + "p" : "auto"),
          format_id: f.format_id
        }));

      res.json({
        title: data.title,
        thumbnail: data.thumbnail,
        formats
      });

    } catch (e) {
      res.json({ error: "Parse error" });
    }
  });
});

// DOWNLOAD
app.get("/download", (req, res) => {
  const { url, format } = req.query;

  if (!url || !format) return res.send("Missing params");

  const file = "video.mp4";

  exec(`python3 -m yt_dlp -f ${format} -o "${file}" "${url}"`, (err) => {
    if (err) return res.send("Download failed");

    res.download(file);
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));

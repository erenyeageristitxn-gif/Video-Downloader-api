const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");

const app = express();
app.use(cors());

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

// VIDEO INFO API
app.get("/api", (req, res) => {
  const url = req.query.url;
  if (!url) return res.json({ error: "No URL provided" });

  exec(`python -m yt_dlp -j "${url}"`, (err, stdout) => {
    if (err) return res.json({ error: "yt-dlp failed" });

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

    } catch {
      res.json({ error: "Parse error" });
    }
  });
});

// DOWNLOAD API
app.get("/download", (req, res) => {
  const { url, format } = req.query;

  if (!url || !format) return res.send("Missing params");

  const file = "video.mp4";

  exec(`python -m yt_dlp -f ${format} -o "${file}" "${url}"`, (err) => {
    if (err) return res.send("Download failed");

    res.download(file, () => {
      fs.unlinkSync(file); // delete after download
    });
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));

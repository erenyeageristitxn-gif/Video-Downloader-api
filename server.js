const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
app.use(cors());

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

// API ROUTE (FIXED FOR YOUTUBE)
app.get("/api", (req, res) => {
  const url = req.query.url;

  if (!url) return res.json({ error: "No URL provided" });

  const cmd = `python3 -m yt_dlp --add-header "User-Agent: Mozilla/5.0" --extractor-args "youtube:player_client=android" -J "${url}"`;

  exec(cmd, (err, stdout, stderr) => {
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

    } catch {
      res.json({ error: "Parse error" });
    }
  });
});

// DOWNLOAD ROUTE
app.get("/download", (req, res) => {
  const { url, format } = req.query;

  if (!url || !format) return res.send("Missing params");

  const file = "video.mp4";

  const cmd = `python3 -m yt_dlp -f ${format} -o "${file}" "${url}"`;

  exec(cmd, (err) => {
    if (err) return res.send("Download failed");

    res.download(file);
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));

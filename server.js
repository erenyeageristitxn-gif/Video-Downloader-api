const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Server is working!");
});

// THIS IS IMPORTANT 👇
app.get("/api", (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.send("No URL provided");
  }

  res.json({
    success: true,
    message: "API working",
    videoUrl: url
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
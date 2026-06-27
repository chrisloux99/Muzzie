<p align="center">
  <img src="https://img.shields.io/badge/🎵-Muzzie-d4760a?style=for-the-badge&labelColor=0c1a10" alt="Muzzie" height="60">
</p>

<h1 align="center">Muzzie</h1>

<p align="center">
  <strong>AI Music Generator with Zambian Heritage Aesthetics</strong><br>
  <em>Generate professional AI music with a beautiful, Spotify-inspired interface</em>
</p>

<p align="center">
  <a href="https://www.youtube.com/@Ambsd-yy7os">
    <img src="https://img.shields.io/badge/▶_Subscribe-YouTube-FF0000?style=for-the-badge&logo=youtube" alt="Subscribe on YouTube">
  </a>
  <a href="https://x.com/AmbsdOP">
    <img src="https://img.shields.io/badge/Follow-@AmbsdOP-1DA1F2?style=for-the-badge&logo=x&logoColor=white" alt="Follow on X">
  </a>
</p>

<p align="center">
  <a href="#-demo">Demo</a> •
  <a href="#-why-muzzie">Why Muzzie</a> •
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?style=flat-square&logo=tailwindcss" alt="TailwindCSS">
  <img src="https://img.shields.io/badge/SQLite-Local_First-003B57?style=flat-square&logo=sqlite" alt="SQLite">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/github/stars/chrisloux99/Muzzie?style=flat-square" alt="Stars">
</p>

---

## Demo

<p align="center">
  <a href="https://www.youtube.com/watch?v=8zg0Xi36qGc">
    <img src="https://img.shields.io/badge/▶_Watch_Full_Demo-YouTube-FF0000?style=for-the-badge&logo=youtube" alt="Watch Demo on YouTube">
  </a>
</p>

<p align="center">
  <img src="docs/demo.gif" alt="Muzzie - AI Music Generator" width="100%">
</p>

<p align="center">
  <em>Generate professional AI music with a Spotify-like interface - 100% free and local</em>
</p>

---

## Why Muzzie?

**Tired of paying $10+/month for Suno or Udio?** Muzzie gives you a **beautiful, professional interface** to generate AI music locally on your own GPU — completely free.

| Feature | Suno/Udio | Muzzie |
|---------|-----------|--------|
| **Cost** | $10-50/month | **FREE forever** |
| **Privacy** | Cloud-based | **100% local** |
| **Ownership** | Licensed | **You own everything** |
| **Customization** | Limited | **Full control** |
| **Queue Limits** | Restricted | **Unlimited** |
| **Commercial Use** | Expensive tiers | **No restrictions** |

---

## Features

### AI Music Generation
| Feature | Description |
|---------|-------------|
| **Full Song Generation** | Create complete songs with vocals and lyrics up to 4+ minutes |
| **Instrumental Mode** | Generate instrumental tracks without vocals |
| **Custom Mode** | Fine-tune BPM, key, time signature, and duration |
| **Style Tags** | Define genre, mood, tempo, and instrumentation |
| **Batch Generation** | Generate multiple variations at once |
| **AI Enhance** | Enrich genre tags into detailed captions with proper BPM/key/time |
| **Thinking Mode** | Let AI reason about structure and generate audio codes |

### Advanced Parameters
| Feature | Description |
|---------|-------------|
| **Reference Audio** | Use any audio file as a style reference |
| **Audio Cover** | Transform existing audio with new styles |
| **Repainting** | Regenerate specific sections of a track |
| **Seed Control** | Reproduce exact generations for consistency |
| **Inference Steps** | Control quality vs speed tradeoff |

### Lyrics & Prompts
| Feature | Description |
|---------|-------------|
| **Lyrics Editor** | Write and format lyrics with structure tags |
| **Format Assistant** | AI-powered caption and lyrics formatting |
| **Prompt Templates** | Quick-start with genre presets |
| **Reuse Prompts** | Clone settings from any previous generation |

### Professional Interface
| Feature | Description |
|---------|-------------|
| **Spotify-Inspired UI** | Clean, modern design with dark/light mode |
| **Bottom Player** | Full-featured player with waveform and progress |
| **Library Management** | Browse, search, and organize all your tracks |
| **Likes & Playlists** | Organize favorites into custom playlists |
| **Real-time Progress** | Live generation progress with queue position |
| **LAN Access** | Use from any device on your local network |

### Built-in Tools
| Feature | Description |
|---------|-------------|
| **Audio Editor** | Trim, fade, and apply effects with AudioMass |
| **Stem Extraction** | Separate vocals, drums, bass, and other with Demucs |
| **Video Generator** | Create music videos with Pexels backgrounds |
| **Gradient Covers** | Beautiful procedural album art (no internet needed) |

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, TailwindCSS, Vite |
| **Backend** | Express.js, SQLite |
| **AI Engine** | ACE-Step 1.5 (Gradio API) |
| **Audio Tools** | AudioMass, Demucs, FFmpeg |

---

## Requirements

| Requirement | Specification |
|-------------|---------------|
| **Node.js** | 18 or higher |
| **Python** | 3.10+ (3.11 recommended) OR Windows Portable Package |
| **NVIDIA GPU** | 4GB+ VRAM (works without LLM), 12GB+ recommended (with LLM) |
| **CUDA** | 12.8 (for Windows Portable Package) |
| **FFmpeg** | For audio processing |

---

## Quick Start

### Windows - One-Click Start
```batch
start-all.bat
```
Starts everything: AI engine + backend + frontend in one command.

### Linux / macOS - One-Click Start
```bash
./start-all.sh
```

### Manual Start

**1. Start the AI engine:**
```bash
# Windows Portable Package
cd C:\ACE-Step-1.5
python_embeded\python -m acestep --port 8001 --enable-api --backend pt --server-name 127.0.0.1

# Linux / macOS
cd /path/to/ACE-Step-1.5
uv run acestep --port 8001 --enable-api --backend pt --server-name 127.0.0.1
```

**2. Start Muzzie:**
```bash
npm start
```

Open **http://localhost:3000** and start creating!

---

## Installation

### 1. Install the AI Engine

#### Windows Portable Package (Recommended)

1. Download [ACE-Step-1.5.7z](https://files.acemusic.ai/acemusic/win/ACE-Step-1.5.7z) (~5GB)
2. Extract to `C:\ACE-Step-1.5`
3. Done! Includes Python with all dependencies

Works with 4GB GPU. CUDA 12.8 included. Zero setup hassle.

#### Standard Installation (All Platforms)

```bash
git clone https://github.com/ace-step/ACE-Step-1.5
cd ACE-Step-1.5
uv venv
uv pip install -e .
```

Models download automatically on first run (~5GB).

### 2. Install Muzzie

```bash
git clone https://github.com/chrisloux99/Muzzie
cd Muzzie
npm install
cd server && npm install && cd ..
cp server/.env.example server/.env
```

---

## Usage

### Simple Mode
Just describe what you want. The AI handles the rest.

> "An upbeat pop song about summer adventures with catchy hooks"

### Custom Mode
Full control over every parameter:

| Parameter | Description |
|-----------|-------------|
| **Lyrics** | Full lyrics with `[Verse]`, `[Chorus]` tags |
| **Style** | Genre, mood, instruments, tempo |
| **Duration** | 30-240 seconds |
| **BPM** | 60-200 beats per minute |
| **Key** | Musical key (C major, A minor, etc.) |

### AI Enhance & Thinking Mode

| Mode | What it does | Speed impact |
|------|-------------|--------------|
| **AI Enhance OFF** | Sends your style tags directly to the model | Fastest |
| **AI Enhance ON** | LLM enriches your tags into a detailed caption | +10-20s |
| **Thinking Mode** | Full LLM reasoning with audio code generation | Slowest, best quality |

---

## Configuration

Edit `server/.env`:

```env
PORT=3001
ACESTEP_API_URL=http://localhost:8001
DATABASE_PATH=./data/muzzie.db
PEXELS_API_KEY=your_key_here
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **AI engine not reachable** | Ensure it's running with `--enable-api` flag |
| **CUDA out of memory** | Set batch size to 1, reduce duration, or disable Thinking Mode |
| **Genre sounds wrong** | Enable AI Enhance for better genre accuracy |
| **Songs show 0:00 duration** | Install FFmpeg |
| **LAN access not working** | Check firewall allows ports 3000 and 3001 |

---

## Contributing

We need your help to make Muzzie even better!

- Report bugs by opening a GitHub issue
- Suggest features — we'd love to hear your ideas
- Submit PRs — code contributions are always welcome
- Improve docs — help others get started

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Stay Connected

<p align="center">
  <a href="https://www.youtube.com/@Ambsd-yy7os">
    <img src="https://img.shields.io/badge/YouTube-Subscribe_for_Tutorials-FF0000?style=for-the-badge&logo=youtube" alt="YouTube">
  </a>
  <a href="https://x.com/AmbsdOP">
    <img src="https://img.shields.io/badge/X_(Twitter)-Follow_for_Updates-1DA1F2?style=for-the-badge&logo=x&logoColor=white" alt="X/Twitter">
  </a>
</p>

---

## Credits

- **[ACE-Step](https://github.com/ace-step/ACE-Step-1.5)** - The open source AI music generation model powering Muzzie
- **[AudioMass](https://github.com/pkalogiros/AudioMass)** - Web audio editor
- **[Demucs](https://github.com/facebookresearch/demucs)** - Audio source separation
- **[Pexels](https://www.pexels.com)** - Stock video backgrounds

---

## License

This project is open source under the [MIT License](LICENSE).

---

<p align="center">
  <strong>If Muzzie helps you create amazing music, please star this repo!</strong>
</p>

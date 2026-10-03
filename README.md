# EchoChapters

Turn long lectures and videos into a searchable, multilingual media library.

Upload one file and EchoChapters transcribes it, splits it into chapters, cuts each chapter into its own clip, builds a highlight reel with English subtitles burned in, and generates subtitles in the language you pick. Every clip is stored with its topic, summary and tags, so you can search the library later without a separate database.

## What it does

| Feature        | How it works                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Transcription  | Cloudinary speech-to-text (`google_speech`) runs first. If it returns nothing, Gemini 2.5 Flash transcribes the audio into timestamped segments. |
| Chapters       | Gemini reads the transcript and returns 2 to 6 chapters with titles, summaries and tags.                                                         |
| Clips          | Each chapter is cropped into its own Cloudinary asset and tagged with its metadata.                                                              |
| Highlight reel | Gemini picks 2 to 4 moments of 5 to 12 seconds. They are spliced into one video, with English subtitles burned in as timed text layers.          |
| Subtitles      | Segments are translated into the chosen language and delivered as captions on the player, plus a downloadable WebVTT file.                       |
| Library search | Searches topics, summaries and tags across all clips. Each result shows a title, description and clickable topic tags, and plays inline.         |

## Tech stack

- Next.js 16 (App Router) and React 19
- Tailwind CSS 4
- Cloudinary for storage, transformations, speech-to-text and delivery
- Google Gemini 2.5 Flash via `@google/genai`
- Geist and Geist Mono through `next/font`
- `lucide-react` for icons

## Getting started

### Prerequisites

- Node.js 20 or newer
- A [Cloudinary](https://cloudinary.com) account. Enable the Google Speech-to-Text add-on for the best transcripts. Without it, the Gemini fallback is used.
- A [Gemini API key](https://aistudio.google.com/apikey)

### Setup

```bash
npm install
```

Create `.env.local` in the project root:

```bash
# Cloudinary reads this automatically. Copy it from your Cloudinary dashboard.
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>

# Gemini
GEMINI_API_KEY=your_key_here

# Optional. Falls back to CLOUDINARY_CLOUD_NAME.
NEXT_PUBLIC_CLOUD_NAME=<cloud_name>
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page and [http://localhost:3000/studio](http://localhost:3000/studio) for the app.

### Scripts

| Command         | Purpose                      |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the development server |
| `npm run build` | Create a production build    |
| `npm run start` | Run the production build     |
| `npm run lint`  | Run ESLint                   |

## Using the studio

1. Open `/studio` and choose a video or audio file.
2. Wait while it uploads and processes. Long files can take a few minutes.
3. Click any chapter to jump to that point in the video.
4. Pick a language under Subtitle language and press Generate. Captions appear on the video. Use the Captions row to switch languages or turn them off.
5. Watch the highlight reel. English subtitles are part of the video.
6. Open the Library tab to search every processed clip by topic, summary or tag.

## Project structure

```
src/
  app/
    page.tsx                  Landing page
    globals.css               Design tokens and shared styles
    layout.tsx                Fonts and metadata
    studio/page.tsx           Studio route
    api/
      upload/route.ts         Uploads the file to Cloudinary
      process/route.ts        Transcribe, chapter, clip, highlight reel
      subtitles/route.ts      Translate segments and write a WebVTT file
      search/route.ts         Search clips by topic, summary and tags
      debug/route.ts          Diagnostics (remove before deploying)
  components/
    landing/                  Nav, Hero, Pipeline, Platform, CtaFooter
    studio/                   StudioShell, UploadPanel, ResultsView,
                              ChapterList, SubtitlePanel, SearchPanel
    ui/Reveal.tsx             Scroll-entry animation
  lib/
    clients.ts                Cloudinary and Gemini clients
    reel.ts                   Reel splicing and burned-in subtitle layers
    clipMeta.ts               Titles, descriptions and tags for library cards
    api.ts                    Typed client for the API routes
    types.ts                  Shared types
```

## API routes

| Route            | Method | Purpose                                                                                      |
| ---------------- | ------ | -------------------------------------------------------------------------------------------- |
| `/api/upload`    | POST   | Accepts a multipart `file` and returns the Cloudinary `public_id`.                           |
| `/api/process`   | POST   | Takes `{ publicId }` and returns clips, the reel URL, segments and stats. Up to 300 seconds. |
| `/api/subtitles` | POST   | Takes `{ publicId, lang, segs }` and returns the VTT URL and translated cues.                |
| `/api/search`    | GET    | Takes `?q=` and returns matching clips with topic, summary and tags.                         |

## Design system

The interface uses a dark green-black palette with a single moss accent and a pale mist section for contrast, with light-weight Geist headlines. All colors and fonts are tokens in `src/app/globals.css`, so a theme change means editing one file. Images on the landing page are placeholders, so replace them with real footage stills.

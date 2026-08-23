import {
  ArrowRight,
  Code2,
  ImageMinus,
  LockKeyhole,
  ScanSearch,
  Sparkles,
} from 'lucide-react'
import { Brand } from './Brand'
import { Dropzone } from './Dropzone'

interface LandingPageProps {
  onFile: (file: File) => void
  onDemo: () => void
  onError: (message: string) => void
  busy: boolean
  error: string | null
}

const featureCards = [
  {
    icon: ScanSearch,
    title: 'Frame it',
    copy: 'Crop, rotate, resize, and blur exactly what needs changing.',
  },
  {
    icon: Sparkles,
    title: 'Finish it',
    copy: 'Tune color, add text, stickers, backgrounds, and watermarks.',
  },
  {
    icon: ImageMinus,
    title: 'Clear it',
    copy: 'Remove connected solid backgrounds without sending a file away.',
  },
]

export function LandingPage({
  onFile,
  onDemo,
  onError,
  busy,
  error,
}: LandingPageProps) {
  return (
    <div className="landing">
      <header className="landing__header shell">
        <Brand />
        <nav className="landing__nav" aria-label="Project links">
          <a href="#capabilities">Tools</a>
          <a
            className="button button--quiet button--small"
            href="https://github.com/mbianchidev/img-tools"
            target="_blank"
            rel="noreferrer"
          >
            <Code2 aria-hidden="true" />
            GitHub
          </a>
        </nav>
      </header>

      <main>
        <section className="hero shell">
          <div className="hero__copy">
            <div className="eyebrow">
              <LockKeyhole aria-hidden="true" />
              Open source · local by design
            </div>
            <h1>
              Your image has
              <span> places to go.</span>
            </h1>
            <p className="hero__lede">
              One private workspace to crop, compress, convert, retouch, and
              export. Your pixels stay in your browser.
            </p>
            <a className="text-link" href="#open-image">
              Start with an image
              <ArrowRight aria-hidden="true" />
            </a>
          </div>

          <div className="hero__visual" aria-label="Image editing preview">
            <div className="contact-sheet" aria-hidden="true">
              <div className="contact-sheet__top">
                <span />
                <span />
                <span />
                <b>IMG_2048</b>
              </div>
              <div className="contact-sheet__canvas">
                <div className="contact-sheet__sun" />
                <div className="contact-sheet__mountain contact-sheet__mountain--back" />
                <div className="contact-sheet__mountain contact-sheet__mountain--front" />
                <div className="contact-sheet__crop">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className="contact-sheet__strip">
                <span>1600 × 1050</span>
                <span>WEBP</span>
                <strong>684 KB</strong>
              </div>
            </div>
            <div className="hero__badge">100% in-browser</div>
          </div>
        </section>

        <section className="open-image shell" id="open-image">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Open the workbench</p>
              <h2>Start with one image.</h2>
            </div>
            <p>No account, server, or upload queue.</p>
          </div>
          <Dropzone
            onFile={onFile}
            onDemo={onDemo}
            onError={onError}
            busy={busy}
          />
          <p className="status-message" role="status" aria-live="polite">
            {error}
          </p>
        </section>

        <section className="capabilities shell" id="capabilities">
          <div className="section-heading">
            <div>
              <p className="section-kicker">A complete local toolkit</p>
              <h2>From rough shot to ready asset.</h2>
            </div>
            <p>Make a fast correction or build a layered composition.</p>
          </div>
          <div className="feature-grid">
            {featureCards.map(({ icon: Icon, title, copy }) => (
              <article className="feature-card" key={title}>
                <Icon aria-hidden="true" />
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <div className="capability-list" aria-label="Available image tools">
            {[
              'Compress to quality or max MB',
              'Crop and rotate',
              'JPG · PNG · WebP',
              'Text and stickers',
              'Effects and filters',
              'Background removal',
              'Selective blur',
              'Resize and upscale',
              'Solid backgrounds',
              'Watermarks',
            ].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing__footer shell">
        <Brand compact />
        <p>Free to use, inspect, change, and self-host under the MIT License.</p>
        <a
          href="https://github.com/mbianchidev/img-tools"
          target="_blank"
          rel="noreferrer"
        >
          Source code
          <ArrowRight aria-hidden="true" />
        </a>
      </footer>
    </div>
  )
}

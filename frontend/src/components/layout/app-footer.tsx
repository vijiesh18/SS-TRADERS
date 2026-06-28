// Hidden for now per request. Set SHOW_FOOTER = true to bring the footer back.
const SHOW_FOOTER = false;

export function AppFooter() {
  if (!SHOW_FOOTER) return null;

  const text = "SS TRADERS MANAGEMENT SYSTEM  ·  Designed & Curated by Vijiesh";
  return (
    <footer className="glass-footer">
      <span className="footer-scroll-track">
        <span className="footer-scroll-text">
          {text}&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;{text}&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;
        </span>
      </span>
    </footer>
  );
}

import { Bell, House } from "lucide-react";
import { MascotMark } from "@/components/sprout-mascot";

type NavLink = { label: string; href: string };

type Props = {
  variant: "student" | "parent";
  /** Which nav link is the current page. */
  current?: string;
};

const links: Record<Props["variant"], NavLink[]> = {
  student: [
    { label: "Scenarios", href: "/student" },
    { label: "My stars", href: "/student#stars" },
    { label: "Help", href: "/student#help" },
  ],
  parent: [
    { label: "Overview", href: "/parent" },
    { label: "Conversations", href: "/parent#conversations" },
  ],
};

/**
 * The header both dashboards share: brand, pages, one icon, and the entry on
 * the right — a log-in button for the child, the account avatar for the parent.
 */
export function AppNav({ variant, current }: Props) {
  return (
    <header className="app-nav">
      <a className="app-nav__brand" href="/landing/">
        <span className="app-nav__mark" aria-hidden="true"><MascotMark size={28} /></span>
        <span>
          <strong className="app-nav__name">Sprout</strong>
          <span className="app-nav__who">{variant === "student" ? "Practice" : "Tracking panel"}</span>
        </span>
      </a>

      <div className="app-nav__right">
        <nav className="app-nav__links" aria-label="Pages">
          {links[variant].map((link) => (
            <a
              key={link.label}
              className="app-nav__link"
              href={link.href}
              aria-current={link.label === current ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {variant === "student" ? (
          <>
            <a className="app-nav__icon" href="/landing/" aria-label="Go back home">
              <House aria-hidden="true" />
            </a>
            <a className="app-nav__cta" href="/landing/">Log in</a>
          </>
        ) : (
          <>
            <a className="app-nav__icon" href="/landing/" aria-label="Go back home">
              <House aria-hidden="true" />
            </a>
            <a className="app-nav__icon" href="/parent#conversations" aria-label="Recent activity">
              <Bell aria-hidden="true" />
            </a>
            <details className="app-nav__profile">
              <summary className="app-nav__avatar" aria-label="Open Lin W. profile">
                <span aria-hidden="true">LW</span>
                <span>Lin W.</span>
              </summary>
              <div className="app-nav__profile-card">
                <div className="profile-card__heading">
                  <span aria-hidden="true">LW</span>
                  <div>
                    <strong>Lin W.</strong>
                    <p>Parent account</p>
                  </div>
                </div>
                <dl className="profile-card__details">
                  <div>
                    <dt>Child</dt>
                    <dd>Ming, age 8</dd>
                  </div>
                  <div>
                    <dt>Relationship</dt>
                    <dd>Parent</dd>
                  </div>
                </dl>
              </div>
            </details>
          </>
        )}
      </div>
    </header>
  );
}

import { Bell, Sprout, Users } from "lucide-react";

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
    { label: "Recordings", href: "/parent#recordings" },
    { label: "About the scores", href: "/parent#about" },
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
        <span className="app-nav__mark" aria-hidden="true"><Sprout /></span>
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
            <a className="app-nav__icon" href="/choose" aria-label="Switch to a different profile">
              <Users aria-hidden="true" />
            </a>
            <a className="app-nav__cta" href="/choose">Log in</a>
          </>
        ) : (
          <>
            <a className="app-nav__icon" href="/parent#recordings" aria-label="Recent activity">
              <Bell aria-hidden="true" />
            </a>
            <a className="app-nav__avatar" href="/choose">
              <span aria-hidden="true">LW</span>
              <span>Lin W.</span>
            </a>
          </>
        )}
      </div>
    </header>
  );
}

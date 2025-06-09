import type { Site, Page, Links, Socials } from "@types"

// Global
export const SITE: Site = {
  TITLE: "twango.dev",
  DESCRIPTION: "Welcome to Astro Sphere, a portfolio and blog for designers and developers.",
  AUTHOR: "James Ding",
}

// Work Page
export const WORK: Page = {
  TITLE: "Work",
  DESCRIPTION: "Places I have worked.",
}

// Blog Page
export const BLOG: Page = {
  TITLE: "Blog",
  DESCRIPTION: "Writing on topics I am passionate about.",
}

// Projects Page 
export const PROJECTS: Page = {
  TITLE: "Projects",
  DESCRIPTION: "Recent projects I have worked on.",
}

// Search Page
export const SEARCH: Page = {
  TITLE: "Search",
  DESCRIPTION: "Search all posts and projects by keyword.",
}

// Links
export const LINKS: Links = [
  { 
    TEXT: "Home", 
    HREF: "/", 
  },
  { 
    TEXT: "Work", 
    HREF: "/work",
  },
  { 
    TEXT: "Blog", 
    HREF: "/blog", 
  },
  { 
    TEXT: "Projects", 
    HREF: "/projects", 
  },
]

// Socials
export const SOCIALS: Socials = [
  { 
    NAME: "Email",
    ICON: "email", 
    TEXT: "james@twango.dev",
    HREF: "mailto:james@twango.dev",
  },
  { 
    NAME: "Github",
    ICON: "github",
    TEXT: "twangodev",
    HREF: "https://github.com/twangodev"
  },
  { 
    NAME: "LinkedIn",
    ICON: "linkedin",
    TEXT: "in/jamesding365",
    HREF: "https://www.linkedin.com/in/jamesding365/",
  },
  { 
    NAME: "Twitter",
    ICON: "twitter-x",
    TEXT: "@twangodev",
    HREF: "https://twitter.com/twangodev",
  },
]


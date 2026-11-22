/** A post or story from a community (a subreddit, Hacker News), as collected. */
export interface RawDiscussion {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  /** How the community is shown to readers, e.g. "r/ExperiencedDevs" or "Hacker News". */
  community: string;
  upvotes: number;
  commentsCount: number;
  tags: string[];
  weight: number;
}

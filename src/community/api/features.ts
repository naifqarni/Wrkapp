/**
 * Round 3 features: companies, polls, the question of the week, saved posts, search.
 * Every call is optional on the backend; a screen asks `can.x()` first and hides what is missing.
 * This file is the one reader, so a renamed field is a one-line change here.
 */
import { getCommunityApi } from './index';
import type { ChannelId, CommunityApi, Page, Post } from './types';

export interface Company {
  id: string;
  name: string;
  nameEn: string | null;
  domain: string | null;
  sector: string | null;
  /** The company's own public site icon, served by our backend. null = draw the monogram. */
  iconUrl: string | null;
  memberCount: number;
  postCount: number;
  mine: boolean;
}

export interface Poll {
  options: { id: string; text: string; votes: number }[];
  totalVotes: number;
  myOptionId: string | null;
}

export interface WeeklyQuestion {
  id: string;
  postId: string;
  text: string;
  endsAt: string;
  answerCount: number;
}

export type RichPost = Post & { poll?: Poll | null; savedByMe?: boolean };

interface FeatureCalls {
  listCompanies(q?: { search?: string; cursor?: string | null; limit?: number }): Promise<Page<Company>>;
  getCompany(id: string): Promise<Company>;
  votePoll(postId: string, optionId: string): Promise<Post>;
  getWeeklyQuestion(): Promise<WeeklyQuestion | null>;
  setSaved(postId: string, saved: boolean): Promise<void>;
  listSavedPosts(q?: { cursor?: string | null; limit?: number }): Promise<Page<Post>>;
  searchPosts(q: { query: string; cursor?: string | null; limit?: number }): Promise<Page<Post>>;
}

export function fx(): CommunityApi & Partial<FeatureCalls> {
  return getCommunityApi() as unknown as CommunityApi & Partial<FeatureCalls>;
}
const has = (k: keyof FeatureCalls) => typeof fx()[k] === 'function';

export const can = {
  companies: () => has('listCompanies'),
  polls: () => has('votePoll'),
  weekly: () => has('getWeeklyQuestion'),
  save: () => has('setSaved') && has('listSavedPosts'),
  search: () => has('searchPosts'),
};

export function createPostWithPoll(input: { channel: ChannelId; body: string; poll?: { options: string[] } }): Promise<Post> {
  return (fx().createPost as (i: typeof input) => Promise<Post>)(input);
}

export const pollOf = (p: Post): Poll | null => (p as RichPost).poll ?? null;
export const savedOf = (p: Post): boolean => !!(p as RichPost).savedByMe;

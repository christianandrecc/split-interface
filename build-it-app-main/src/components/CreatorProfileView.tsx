import { useRef, useState } from "react";
import type { UserProfile } from "@/lib/userProfile";
import type { CreatorCredit, CreatorProfile, CreatorSpotlightItem } from "@/types/creatorProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import {
  ArrowRight, ArrowUpRight, AtSign, BadgeCheck, BookOpen, ChevronRight, Copy,
  Edit3, FileText, Globe2, Instagram, LockKeyhole, MapPin, MessageCircle, Music2, Search, UserRound, X,
} from "lucide-react";
import { creatorSocialLinks, mergeCreatorProfile, type CreatorSocialLink } from "@/lib/creatorProfileView";
import "./creator-profile.css";

type CreatorProfileViewProps = {
  userProfile?: UserProfile;
  creatorProfile?: CreatorProfile;
  mode?: "own" | "collaborator";
  onEditProfile?: () => void;
  onMessage?: () => void;
  onViewSplitSheets?: () => void;
};

export default function CreatorProfileView(props: CreatorProfileViewProps) {
  const identity = props.userProfile?.authUserId || props.userProfile?.username || props.creatorProfile?.id || "own";
  return <CreatorProfileContent key={`${props.mode}:${identity}`} {...props} />;
}

function CreatorProfileContent({ userProfile, creatorProfile, mode = "own", onEditProfile, onMessage, onViewSplitSheets }: CreatorProfileViewProps) {
  const profile = mergeCreatorProfile(creatorProfile, userProfile);
  const socials = creatorSocialLinks(profile.socials);
  const [query, setQuery] = useState("");
  const [releaseType, setReleaseType] = useState("all");
  const [selectedCredit, setSelectedCredit] = useState<CreatorCredit | null>(null);
  const [selectedStory, setSelectedStory] = useState<CreatorSpotlightItem | null>(null);
  const [copying, setCopying] = useState(false);
  const detailTrigger = useRef<HTMLButtonElement>(null);
  const restoreDetailFocus = (event: Event) => { event.preventDefault(); detailTrigger.current?.focus(); };
  const releaseTypes = [...new Set(profile.credits.map(credit => credit.releaseType).filter(Boolean))].sort();
  const filteredCredits = profile.credits.filter(credit =>
    (releaseType === "all" || credit.releaseType === releaseType) &&
    [credit.title, credit.artist, credit.contribution, credit.year].join(" ").toLowerCase().includes(query.trim().toLowerCase()),
  );
  const isPublic = userProfile?.profileVisibility === "Public";
  const name = profile.displayName || profile.username || (mode === "own" ? "Your profile" : "SPLIT creator");

  const copyUsername = async () => {
    setCopying(true);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(`@${profile.username}`);
      toast({ title: "Username copied", description: `@${profile.username}` });
    } catch {
      toast({ title: "Couldn't copy username", description: "Please select and copy the username instead.", variant: "destructive" });
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="creator-page">
      <TooltipProvider delayDuration={200}>
        <div className="creator-shell">
          <header className="creator-header">
            <ProfileImage src={profile.profileImage} name={name} />
            <div className="creator-identity">
              <div className="creator-name">
                <h1>{name}</h1>
                {profile.verified && <BadgeCheck className="creator-verified" aria-label="Verified creator" />}
              </div>
              {profile.username && <p className="creator-username">@{profile.username}</p>}
              <div className="creator-meta">
                {profile.location && <span><MapPin aria-hidden="true" />{profile.location}</span>}
                {mode === "own" && <span>{isPublic ? <Globe2 aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}{isPublic ? "Public profile" : "Collaborators only"}</span>}
              </div>
            </div>
            <div className="creator-actions">
              {profile.username && <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => void copyUsername()} disabled={copying} aria-label="Copy username" className="creator-icon-action"><Copy aria-hidden="true" /></Button>
                </TooltipTrigger>
                <TooltipContent>Copy username</TooltipContent>
              </Tooltip>}
              {mode === "own" && onEditProfile && <Button onClick={onEditProfile} className="creator-main-action"><Edit3 aria-hidden="true" />Edit profile</Button>}
              {mode === "collaborator" && onMessage && <Button onClick={onMessage} className="creator-main-action"><MessageCircle aria-hidden="true" />Messages</Button>}
            </div>
            {(profile.roles.length > 0 || socials.length > 0) && <div className="creator-identity-footer">
              <div className="creator-roles" aria-label="Creative roles">{profile.roles.map(role => <span key={role}>{role}</span>)}</div>
              {socials.length > 0 && <nav className="creator-socials" aria-label="Social profiles">{socials.map(social => <SocialLink key={social.platform} social={social} compact />)}</nav>}
            </div>}
          </header>

          <Tabs defaultValue="credits" className="creator-tabs">
            <TabsList className="creator-navigation" aria-label="Profile sections">
              <TabsTrigger value="credits"><BadgeCheck aria-hidden="true" />Credits<span className="creator-count">{profile.credits.length}</span></TabsTrigger>
              <TabsTrigger value="about"><UserRound aria-hidden="true" />About</TabsTrigger>
              {profile.spotlight.length > 0 && <TabsTrigger value="spotlight"><BookOpen aria-hidden="true" />Spotlight</TabsTrigger>}
            </TabsList>
            <TabsContent value="credits" className="creator-panel">
              <div className="creator-section-heading">
                <h2>Verified credits</h2>
                {mode === "own" && onViewSplitSheets && profile.credits.length > 0 && <Button variant="ghost" onClick={onViewSplitSheets}>Split sheets<ArrowUpRight aria-hidden="true" /></Button>}
              </div>
              {profile.credits.length > 0 ? <>
                <div className="creator-credit-toolbar">
                  <div className="creator-search">
                    <Search aria-hidden="true" /><Input aria-label="Search credits" placeholder="Search credits" value={query} onChange={event => setQuery(event.target.value)} />
                    {query && <button type="button" aria-label="Clear credit search" onClick={() => setQuery("")}><X aria-hidden="true" /></button>}
                  </div>
                  {releaseTypes.length > 1 && <Select value={releaseType} onValueChange={setReleaseType}>
                    <SelectTrigger aria-label="Release type"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All releases</SelectItem>{releaseTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                  </Select>}
                </div>
                <p className="creator-result-count" role="status">{filteredCredits.length} of {profile.credits.length} credits</p>
                {filteredCredits.length > 0 ? <ul className="creator-credit-list" aria-label="Verified credits">
                  {filteredCredits.map(credit => <li key={credit.id}>
                    <button type="button" className="creator-credit-row" onClick={event => { detailTrigger.current = event.currentTarget; setSelectedCredit(credit); }} aria-label={`View credit: ${credit.title}`}>
                      <CoverImage src={credit.image} title={credit.title} />
                      <span className="creator-credit-title"><strong>{credit.title}</strong><span>{credit.artist}</span></span>
                      <span className="creator-credit-role"><BadgeCheck aria-hidden="true" />{credit.contribution}</span>
                      <span className="creator-credit-release">{credit.year}<span>{credit.releaseType}</span></span>
                      <ChevronRight className="creator-row-arrow" aria-hidden="true" />
                    </button>
                  </li>)}
                </ul> : <div className="creator-empty"><Search aria-hidden="true" /><div><h3>No matching credits</h3><Button variant="ghost" onClick={() => { setQuery(""); setReleaseType("all"); }}>Clear filters</Button></div></div>}
              </> : <div className="creator-empty">
                <div className="creator-empty-icon"><Music2 aria-hidden="true" /></div>
                <div><h3>No verified credits yet</h3><p>No public credit records to display.</p>
                  {mode === "own" && onViewSplitSheets && <Button variant="outline" onClick={onViewSplitSheets}><FileText aria-hidden="true" />View split sheets<ArrowRight aria-hidden="true" /></Button>}
                </div>
              </div>}
            </TabsContent>
            <TabsContent value="about" className="creator-panel">
              <div className="creator-section-heading"><h2>Profile details</h2></div>
              {profile.bio && <p className="creator-bio">{profile.bio}</p>}
              <dl className="creator-details">
                <div><dt>Display name</dt><dd>{name}</dd></div>
                <div><dt>Username</dt><dd>{profile.username ? `@${profile.username}` : "Not added"}</dd></div>
                <div><dt>Creative roles</dt><dd>{profile.roles.join(", ") || "Not added"}</dd></div>
                <div><dt>Location</dt><dd>{profile.location || "Not added"}</dd></div>
                {mode === "own" && <div><dt>Visibility</dt><dd>{isPublic ? "Public" : "Collaborators only"}</dd></div>}
              </dl>
              {socials.length > 0 && <section className="creator-links-section" aria-label="Links"><h3>Links</h3><div className="creator-links">{socials.map(social => <SocialLink key={social.platform} social={social} />)}</div></section>}
            </TabsContent>
            {profile.spotlight.length > 0 && <TabsContent value="spotlight" className="creator-panel">
              <div className="creator-section-heading"><h2>Spotlight</h2></div>
              <ul className="creator-story-list">{profile.spotlight.map(story => <li key={story.id}>
                <button type="button" onClick={event => { detailTrigger.current = event.currentTarget; setSelectedStory(story); }} className="creator-story-row">
                  <CoverImage src={story.image} title={story.title} /><span><strong>{story.title}</strong>{story.description && <span>{story.description}</span>}</span><ChevronRight aria-hidden="true" />
                </button>
              </li>)}</ul>
            </TabsContent>}
          </Tabs>
        </div>
      </TooltipProvider>
      <CreditDetailsDialog credit={selectedCredit} onClose={() => setSelectedCredit(null)} onCloseAutoFocus={restoreDetailFocus} />
      <Dialog open={Boolean(selectedStory)} onOpenChange={open => !open && setSelectedStory(null)}>
        <DialogContent className="creator-dialog" onCloseAutoFocus={restoreDetailFocus}>
          {selectedStory && <><DialogHeader><DialogTitle>{selectedStory.title}</DialogTitle><DialogDescription>{selectedStory.description || "Spotlight"}</DialogDescription></DialogHeader>
            {selectedStory.image && <CoverImage src={selectedStory.image} title={selectedStory.title} />}
            {selectedStory.story && <div className="creator-story-copy">
              <p>{selectedStory.story.publishedAt} · {selectedStory.story.readTime}</p>
              {selectedStory.story.pullQuote && <blockquote>{selectedStory.story.pullQuote}</blockquote>}
              {selectedStory.story.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              <dl className="creator-details">{selectedStory.story.credits.map(credit => <div key={credit.label}><dt>{credit.label}</dt><dd>{credit.names.join(", ")}</dd></div>)}</dl>
            </div>}
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileImage({ src, name }: { src: string; name: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return <div className="creator-avatar">{src && src !== failedSrc ? <img src={src} alt={`${name} profile portrait`} onError={() => setFailedSrc(src)} /> : <span aria-hidden="true">{initials}</span>}</div>;
}

function CoverImage({ src, title }: { src: string; title: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return <span className="creator-cover">{src && src !== failedSrc ? <img src={src} alt={`${title} cover art`} loading="lazy" onError={() => setFailedSrc(src)} /> : <Music2 aria-hidden="true" />}</span>;
}

function SocialLink({ social, compact = false }: { social: CreatorSocialLink; compact?: boolean }) {
  const Icon = social.platform === "Instagram" ? Instagram : social.platform === "TikTok" ? Music2 : AtSign;
  return <a href={social.url} target="_blank" rel="noopener noreferrer" className={compact ? "creator-social-link" : "creator-detail-link"} aria-label={`${social.platform} profile (opens in a new tab)`}>
    <Icon aria-hidden="true" /><span>{social.platform}</span>{!compact && <ArrowUpRight aria-hidden="true" />}
  </a>;
}

function CreditDetailsDialog({ credit, onClose, onCloseAutoFocus }: { credit: CreatorCredit | null; onClose: () => void; onCloseAutoFocus: (event: Event) => void }) {
  return <Dialog open={Boolean(credit)} onOpenChange={open => !open && onClose()}>
    <DialogContent className="creator-dialog" onCloseAutoFocus={onCloseAutoFocus}>
      {credit && <>
        <div className="creator-credit-detail-heading"><CoverImage src={credit.image} title={credit.title} /><DialogHeader>
          <DialogTitle>{credit.title}</DialogTitle><DialogDescription>{[credit.artist, credit.year, credit.releaseType].filter(Boolean).join(" · ")}</DialogDescription>
        </DialogHeader></div>
        <dl className="creator-details">
          <div><dt>Contribution</dt><dd className="creator-detail-verified"><BadgeCheck aria-hidden="true" />{credit.contribution}</dd></div>
          {credit.verifiedAt && <div><dt>Verified</dt><dd>{credit.verifiedAt}</dd></div>}
          {credit.collaborators.length > 0 && <div><dt>Collaborators</dt><dd>{credit.collaborators.join(", ")}</dd></div>}
        </dl>
        {credit.collaboratedTracks && credit.collaboratedTracks.length > 0 && <section className="creator-tracks"><h3>Collaborated tracks</h3><ol>{credit.collaboratedTracks.map(track => <li key={track.trackNumber}><span>{track.trackNumber}</span><div><strong>{track.title}</strong><p>{track.contribution}</p></div></li>)}</ol></section>}
        {credit.notes && <p className="creator-credit-notes">{credit.notes}</p>}
      </>}
    </DialogContent>
  </Dialog>;
}

import Badge from "@/components/ui/Badge";

interface BookmarkTagsProps {
  tags: string[];
  onTagClick?: (tag: string) => void;
}

export default function BookmarkTags({ tags, onTagClick }: BookmarkTagsProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => {
        if (!onTagClick) {
          return (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          );
        }

        return (
          <button
            key={tag}
            type="button"
            onClick={() => onTagClick(tag)}
            className="cursor-pointer text-left"
            aria-label={`Filter by tag ${tag}`}
          >
            <Badge tone="neutral">{tag}</Badge>
          </button>
        );
      })}
    </div>
  );
}

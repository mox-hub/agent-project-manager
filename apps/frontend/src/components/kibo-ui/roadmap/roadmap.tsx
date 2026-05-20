"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Eye as EyeIcon, Link as LinkIcon, Trash as TrashIcon } from "lucide-react";
import {
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttFeatureItem,
  type GanttFeature,
} from "@/components/kibo-ui/gantt";

export type RoadmapStatus = {
  id: string;
  name: string;
  color: string;
};

export type RoadmapFeature = {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status?: RoadmapStatus;
  owner?: {
    id: string;
    name: string;
    image?: string;
  };
  group?: {
    id: string;
    name: string;
  };
  progress?: number;
};

type GroupedFeatures = Record<string, RoadmapFeature[]>;

export type RoadmapProps = {
  features: RoadmapFeature[];
  statuses?: RoadmapStatus[];
  defaultView?: "gantt" | "calendar" | "list";
  onViewFeature?: (id: string) => void;
  onMoveFeature?: (id: string, startAt: Date, endAt: Date | null) => void;
  onRemoveFeature?: (id: string) => void;
  onCopyLink?: (id: string) => void;
  className?: string;
};

const groupBy = <T,>(array: T[], getKey: (item: T) => string): Record<string, T[]> =>
  array.reduce((result, item) => {
    const key = getKey(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
    return result;
  }, {} as Record<string, T[]>);

interface GanttViewProps {
  features: RoadmapFeature[];
  onViewFeature?: (id: string) => void;
  onCopyLink?: (id: string) => void;
  onRemoveFeature?: (id: string) => void;
}

const GanttView = ({
  features,
  onViewFeature,
  onCopyLink,
  onRemoveFeature,
}: GanttViewProps) => {
  const groupedFeatures = useMemo<GroupedFeatures>(() => {
    const grouped = groupBy(features, (f) => f.group?.name ?? "Ungrouped");
    return Object.fromEntries(
      Object.entries(grouped).sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
    );
  }, [features]);

  const handleMove = (id: string, startAt: Date, endAt: Date | null) => {
    // Handle move event
    console.log("Move:", id, startAt, endAt);
  };

  return (
    <GanttProvider range="monthly" zoom={100}>
      <GanttSidebar>
        {Object.entries(groupedFeatures).map(([group, items]) => (
          <GanttSidebarGroup key={group} name={group}>
            {items.map((feature) => (
              <GanttSidebarItem
                key={feature.id}
                feature={feature as unknown as GanttFeature}
                onSelect={onViewFeature}
              />
            ))}
          </GanttSidebarGroup>
        ))}
      </GanttSidebar>
      <GanttTimeline>
        <GanttFeatureList>
          {Object.entries(groupedFeatures).map(([group, items]) => (
            <GanttFeatureListGroup key={group}>
              {items.map((feature) => (
                <div className="relative h-[36px]" key={feature.id}>
                  <ContextMenu>
                    <ContextMenuTrigger className="absolute inset-0">
                      <GanttFeatureItem
                        id={feature.id}
                        name={feature.name}
                        startAt={feature.startAt}
                        endAt={feature.endAt}
                        status={feature.status as GanttFeature["status"]}
                        progress={feature.progress}
                        owner={feature.owner as GanttFeature["owner"]}
                      />
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        className="flex items-center gap-2"
                        onClick={() => onViewFeature?.(feature.id)}
                      >
                        <EyeIcon className="text-muted-foreground" size={16} />
                        View
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="flex items-center gap-2"
                        onClick={() => onCopyLink?.(feature.id)}
                      >
                        <LinkIcon className="text-muted-foreground" size={16} />
                        Copy link
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="flex items-center gap-2 text-destructive"
                        onClick={() => onRemoveFeature?.(feature.id)}
                      >
                        <TrashIcon size={16} />
                        Remove
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </div>
              ))}
            </GanttFeatureListGroup>
          ))}
        </GanttFeatureList>
      </GanttTimeline>
    </GanttProvider>
  );
};

// ============================================
// List View
// ============================================

interface ListViewProps {
  features: RoadmapFeature[];
  statuses: RoadmapStatus[];
}

const ListView = ({ features, statuses }: ListViewProps) => {
  return (
    <div className="space-y-4 p-4">
      {statuses.map((status) => {
        const statusFeatures = features.filter((f) => f.status?.id === status.id);
        if (statusFeatures.length === 0) return null;

        return (
          <div key={status.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <h3 className="font-semibold">{status.name}</h3>
              <span className="text-sm text-muted-foreground">
                ({statusFeatures.length})
              </span>
            </div>
            <div className="space-y-1">
              {statusFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{feature.name}</span>
                    {feature.owner && (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={feature.owner.image} />
                        <AvatarFallback>{feature.owner.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {feature.startAt.toLocaleDateString()} -{" "}
                    {feature.endAt.toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// Main Roadmap Component
// ============================================

export function Roadmap({
  features,
  statuses = [],
  defaultView = "gantt",
  onViewFeature,
  onMoveFeature,
  onRemoveFeature,
  onCopyLink,
  className,
}: RoadmapProps) {
  const defaultStatuses: RoadmapStatus[] = statuses.length > 0
    ? statuses
    : [
        { id: "active", name: "Active", color: "#10B981" },
        { id: "planning", name: "Planning", color: "#6B7280" },
        { id: "completed", name: "Completed", color: "#3B82F6" },
      ];

  if (features.length === 0) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg border bg-muted/50">
        <p className="text-muted-foreground">No features to display</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {defaultView === "gantt" && (
        <GanttView
          features={features}
          onViewFeature={onViewFeature}
          onCopyLink={onCopyLink}
          onRemoveFeature={onRemoveFeature}
        />
      )}
      {defaultView === "list" && (
        <ListView features={features} statuses={defaultStatuses} />
      )}
    </div>
  );
}

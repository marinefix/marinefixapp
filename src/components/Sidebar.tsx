import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, FolderTree, X, MessageSquare, Download } from "lucide-react";
import type { Category, Equipment } from "../types";
import { getIcon } from "../lib/icons";
import { navigate } from "../lib/router";
import { Capacitor } from "@capacitor/core";

type Props = {
  categories: Category[];
  equipment: Equipment[];
  guidesCounts?: Record<string, number>;
  activeCategoryId?: string;
  activeEquipmentId?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
  onSelect?: () => void;
};

type TreeNode = Category & { children: TreeNode[] };

export function Sidebar({
  categories,
  equipment,
  guidesCounts = {},
  activeCategoryId,
  activeEquipmentId,
  isOpen = false,
  onClose,
  onNavigate,
  onSelect,
}: Props) {
  const tree = useMemo(() => buildTree(categories), [categories]);

  const initialExpanded = useMemo(() => {
    const set = new Set<string>();
    if (activeCategoryId) {
      let currentId: string | null | undefined = activeCategoryId;
      while (currentId) {
        const current = categories.find((c) => c.id === currentId);
        if (!current) break;
        set.add(current.id);
        currentId = current.parent_id;
      }
    }
    if (activeEquipmentId) {
      const eq = equipment.find((e) => e.id === activeEquipmentId);
      if (eq) {
        set.add(eq.category_id);
        let parentId: string | null = eq.category_id;
        while (parentId) {
          set.add(parentId);
          const parent = categories.find((c) => c.id === parentId);
          parentId = parent?.parent_id ?? null;
        }
      }
    }
    return set;
  }, [categories, equipment, activeCategoryId, activeEquipmentId]);

  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

  function toggle(id: string) {
    setExpanded((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function equipmentFor(catId: string): Equipment[] {
    return equipment
      .filter((e) => e.category_id === catId)
      .sort((a, b) => {
        if (a.name.toLowerCase() === "others") return 1;
        if (b.name.toLowerCase() === "others") return -1;
        return a.name.localeCompare(b.name);
      });
  }

  function getCategoryGuideCount(catId: string): number {
    const directEquip = equipment.filter((e) => e.category_id === catId);
    let total = directEquip.reduce(
      (sum, eq) => sum + (guidesCounts[eq.id] || 0),
      0
    );

    const childCats = categories.filter((c) => c.parent_id === catId);
    childCats.forEach((child) => {
      total += getCategoryGuideCount(child.id);
    });

    return total;
  }

  const handleItemSelect = () => {
    onClose?.();
    onNavigate?.();
    onSelect?.();
  };

  const navContent = (
    <div className="flex flex-col h-full min-h-0 bg-marine-card">
      <nav className="flex-1 min-h-0 overflow-y-auto py-4 scrollbar-marine bg-marine-card">
        <div
          className="px-4 mb-3 flex items-center justify-between text-xs uppercase tracking-wider font-semibold text-marine-muted"
        >
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-blue-500" />
            <span>Departments</span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-1 cursor-pointer transition text-marine-muted hover:text-marine-accent"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <ul className="space-y-1 px-2">
          {tree.map((node) => (
            <DepartmentNode
              key={node.id}
              node={node}
              categories={categories}
              expanded={expanded}
              onToggle={toggle}
              activeCategoryId={activeCategoryId}
              activeEquipmentId={activeEquipmentId}
              equipmentFor={equipmentFor}
              guidesCounts={guidesCounts}
              getCategoryGuideCount={getCategoryGuideCount}
              onSelect={handleItemSelect}
              depth={0}
            />
          ))}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-marine-border bg-marine-card p-2.5 space-y-2">
        <button
          type="button"
          onClick={() => {
            navigate({ name: "feedback" });
            handleItemSelect();
          }}
          className="group w-full rounded-xl border border-marine-accent/30 bg-marine-accent/5 p-2.5 text-left transition hover:bg-marine-accent/10 hover:border-marine-accent/50 cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-marine-accent/40 bg-marine-accent/10 text-marine-accent">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold text-marine-text">
                Help us improve MarineFix
              </div>
              <div className="mt-0.5 text-[9px] leading-snug text-marine-muted">
                Share feedback or suggest a feature.
              </div>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-marine-accent transition group-hover:translate-x-0.5" />
          </div>
        </button>

        {!Capacitor.isNativePlatform() && (
          <a
            href="https://marinefixapp.pages.dev/api/upload?key=MarineFix.apk"
            download="MarineFix.apk"
            className="group block w-full rounded-xl border border-blue-200 bg-blue-50 p-2.5 transition hover:bg-blue-100 hover:border-blue-300 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative h-[66px] w-[38px] shrink-0 rounded-[9px] border-2 border-slate-700 bg-slate-950 p-[2.5px] shadow-[0_3px_8px_rgba(15,23,42,0.28)]">
                <div className="absolute left-1/2 top-[2px] z-10 h-[3px] w-[13px] -translate-x-1/2 rounded-full bg-slate-700" />
                <div className="relative h-full w-full overflow-hidden rounded-[6px] bg-white">
                  <div className="h-[19px] bg-gradient-to-b from-blue-700 to-blue-500 px-1 pt-[5px]">
                    <div className="text-center text-[4px] font-extrabold tracking-tight text-white">
                      MARINE<span className="text-sky-200">FIX</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-[2px] p-[3px]">
                    <span className="h-[11px] rounded-[2px] bg-blue-50 border border-blue-100" />
                    <span className="h-[11px] rounded-[2px] bg-orange-50 border border-orange-100" />
                    <span className="h-[11px] rounded-[2px] bg-blue-50 border border-blue-100" />
                    <span className="h-[11px] rounded-[2px] bg-blue-50 border border-blue-100" />
                  </div>
                  <div className="mx-[3px] h-[7px] rounded-[2px] bg-slate-100 border border-slate-200" />
                  <div className="absolute bottom-[2px] left-1/2 h-[2px] w-[10px] -translate-x-1/2 rounded-full bg-slate-300" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-extrabold text-slate-900">MarineFix App</div>
                <div className="mt-0.5 text-[9px] leading-snug text-slate-500">
                  Access all guides offline on your Android device.
                </div>
                <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[9px] font-bold text-white group-hover:bg-blue-700">
                  <Download className="h-3 w-3" />
                  Download APK
                </span>
              </div>
            </div>
          </a>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="w-72 shrink-0 border-r hidden md:block bg-marine-card border-marine-border sticky top-16 h-[calc(100vh-4rem)] self-start"
      >
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div
            className="relative w-80 max-w-[80vw] border-r h-full z-10 bg-marine-card border-marine-border"
          >
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}

function DepartmentNode({
  node,
  categories,
  expanded,
  onToggle,
  activeCategoryId,
  activeEquipmentId,
  equipmentFor,
  guidesCounts,
  getCategoryGuideCount,
  onSelect,
  depth,
}: {
  node: TreeNode;
  categories: Category[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  activeCategoryId?: string;
  activeEquipmentId?: string;
  equipmentFor: (catId: string) => Equipment[];
  guidesCounts: Record<string, number>;
  getCategoryGuideCount: (catId: string) => number;
  onSelect?: () => void;
  depth: number;
}) {
  const isOpen = expanded.has(node.id);
  const isActive = activeCategoryId === node.id;
  const Icon = getIcon(node.icon, node.name);
  const childNodes = node.children;
  const items = equipmentFor(node.id);

  const hasChildren = childNodes.length > 0 || items.length > 0;
  const catTotalGuides = getCategoryGuideCount(node.id);

  const handleCategoryClick = () => {
    if (hasChildren && !isOpen) {
      onToggle(node.id);
    }
    navigate({ name: "category", id: node.id });
    onSelect?.();
  };

  const categoryRowClass = isActive
    ? "bg-marine-accent/15 text-marine-accent font-semibold"
    : "hover:bg-marine-hover text-marine-text";

  return (
    <li>
      <div
        className={`group flex items-center gap-1 rounded-lg transition ${categoryRowClass}`}
        style={{ paddingLeft: `${depth * 10 + 6}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="p-1 shrink-0 rounded cursor-pointer transition text-marine-muted hover:text-marine-accent"
            title="Expand / Collapse"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}

        <button
          type="button"
          onClick={handleCategoryClick}
          className="flex items-center gap-2 flex-1 py-2 pr-2 text-left min-w-0 cursor-pointer"
          title={node.name}
        >
          <Icon className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="text-xs font-medium truncate leading-tight flex-1">
            {node.name}
          </span>

          {catTotalGuides > 0 && (
            <span
              className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-marine-accent/15 text-marine-accent border-marine-accent/30"
            >
              {catTotalGuides}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <ul className="mt-0.5 space-y-0.5 animate-slide-down">
          {childNodes.map((child) => (
            <DepartmentNode
              key={child.id}
              node={child}
              categories={categories}
              expanded={expanded}
              onToggle={onToggle}
              activeCategoryId={activeCategoryId}
              activeEquipmentId={activeEquipmentId}
              equipmentFor={equipmentFor}
              guidesCounts={guidesCounts}
              getCategoryGuideCount={getCategoryGuideCount}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}

          {items.map((eq) => {
            const count = guidesCounts[eq.id] || 0;
            const isEquipmentActive = activeEquipmentId === eq.id;

            return (
              <li
                key={eq.id}
                className={`group flex items-center rounded-lg transition ${
                  isEquipmentActive
                    ? "bg-marine-accent/15 text-marine-accent font-semibold"
                    : "hover:bg-marine-hover text-marine-text"
                }`}
                style={{
                  paddingLeft: `${(depth + 1) * 10 + 18}px`,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    navigate({ name: "equipment", id: eq.id });
                    onSelect?.();
                  }}
                  className="flex items-center justify-between flex-1 py-1.5 pr-2 text-left text-xs min-w-0 cursor-pointer"
                  title={eq.name}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        count > 0
                          ? "bg-blue-500"
                          : "bg-marine-muted"
                      }`}
                    />
                    <span className="truncate">{eq.name}</span>
                  </div>

                  {count > 0 && (
                    <span
                      className="ml-1 shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white"
                    >
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function buildTree(categories: Category[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();

  categories.forEach((c) =>
    byId.set(c.id, { ...c, children: [] })
  );

  const roots: TreeNode[] = [];

  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  byId.forEach((node) =>
    node.children.sort((a, b) => a.order_index - b.order_index)
  );

  roots.sort((a, b) => a.order_index - b.order_index);

  return roots;
}

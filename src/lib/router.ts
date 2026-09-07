import { useState, useEffect } from "react";

export type Route =
  | { name: "home" }
  | { name: "category"; id: string }
  | { name: "equipment"; id: string }
  | { name: "guide"; id: string }
  | { name: "bookmarks" }
  | { name: "add-guide"; equipmentId?: string }
  | { name: "admin-pending" }
  | { name: "all-guides" }
  | { name: "feedback" };

export function parsePath(pathname: string): Route {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/") return { name: "home" };

  if (path === "/bookmarks")
    return { name: "bookmarks" };

  if (path === "/add-guide")
    return { name: "add-guide" };

  if (path === "/admin-pending")
    return { name: "admin-pending" };

  if (path === "/all-guides")
    return { name: "all-guides" };

  if (path === "/feedback")
    return { name: "feedback" };

  const cat = path.match(
    /^\/category\/([^/]+)$/
  );

  if (cat)
    return {
      name: "category",
      id: decodeURIComponent(cat[1]),
    };

  const equip = path.match(
    /^\/equipment\/([^/]+)$/
  );

  if (equip)
    return {
      name: "equipment",
      id: decodeURIComponent(equip[1]),
    };

  const guide = path.match(
    /^\/guide\/([^/]+)$/
  );

  if (guide)
    return {
      name: "guide",
      id: decodeURIComponent(guide[1]),
    };

  const addGuide = path.match(
    /^\/equipment\/([^/]+)\/add-guide$/
  );

  if (addGuide)
    return {
      name: "add-guide",
      equipmentId: decodeURIComponent(
        addGuide[1]
      ),
    };

  return { name: "home" };
}

export function routeToPath(route: Route): string {
  switch (route.name) {
    case "home":
      return "/";

    case "category":
      return `/category/${encodeURIComponent(
        route.id
      )}`;

    case "equipment":
      return `/equipment/${encodeURIComponent(
        route.id
      )}`;

    case "guide":
      return `/guide/${encodeURIComponent(
        route.id
      )}`;

    case "bookmarks":
      return "/bookmarks";

    case "add-guide":
      return route.equipmentId
        ? `/equipment/${encodeURIComponent(
            route.equipmentId
          )}/add-guide`
        : "/add-guide";

    case "admin-pending":
      return "/admin-pending";

    case "all-guides":
      return "/all-guides";

    case "feedback":
      return "/feedback";
  }
}

export function navigate(route: Route): void {
  window.history.pushState(
    {},
    "",
    routeToPath(route)
  );

  window.dispatchEvent(
    new PopStateEvent("popstate")
  );
}

// Fixed: Clean reset to root '/' via SPA navigation
// (Zero MIME white screen)
export function hardResetHome(): void {
  window.history.pushState({}, "", "/");
  window.dispatchEvent(
    new PopStateEvent("popstate")
  );
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parsePath(window.location.pathname)
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(
        parsePath(window.location.pathname)
      );
    };

    window.addEventListener(
      "popstate",
      handleLocationChange
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handleLocationChange
      );
    };
  }, []);

  return route;
}
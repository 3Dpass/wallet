import type { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useLocation } from "@remix-run/react";
import AssetsSection from "../components/assets/AssetsSection";

export const loader: LoaderFunction = async () => {
  return redirect("/assets/objects");
};

export default function AssetsIndex() {
  const location = useLocation();
  let title = "Assets";
  if (location.pathname.includes("/assets/objects")) title = "Objects";
  else if (location.pathname.includes("/assets/tokens")) title = "Tokens";

  return (
    <AssetsSection>
      <div className="p-4">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <div>
          {title === "Assets"
            ? "Welcome to the Assets section. Select Objects or Tokens above."
            : `This is the ${title} section. Content coming soon.`}
        </div>
      </div>
    </AssetsSection>
  );
}

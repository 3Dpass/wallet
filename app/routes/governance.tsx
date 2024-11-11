import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "@remix-run/react";

export default function Governance() {
  const { t } = useTranslation();
  
  return (
    <div className="grid gap-4">
      <nav className="flex gap-4 mb-4">
        <NavLink 
          to="/governance/members"
          className={({ isActive }) => 
            `px-4 py-2 ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`
          }
        >
          {t("governance.members")}
        </NavLink>
        <NavLink 
          to="/governance/motions"
          className={({ isActive }) => 
            `px-4 py-2 ${isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`
          }
        >
          {t("governance.motions")}
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
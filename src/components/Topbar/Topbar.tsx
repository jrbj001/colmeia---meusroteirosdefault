import React from "react";
import { Avatar } from "../Avatar";
import { ExitToApp } from "../../icons/ExitToApp";
import { Link } from "react-router-dom";

interface TopbarProps {
  menuReduzido: boolean;
  breadcrumb?: {
    items: Array<{
      label: string;
      path?: string;
    }>;
  };
}

export const Topbar: React.FC<TopbarProps> = ({ menuReduzido, breadcrumb }) => {
  const defaultBreadcrumb = [
    { label: "Home", path: "/" },
    { label: "Meus roteiros", path: "/" }
  ];

  const breadcrumbItems = breadcrumb?.items || defaultBreadcrumb;

  return (
    <div
      className={`fixed top-0 z-30 bg-white border-b border-[#c1c1c1] p-4 transition-all duration-300
        ${menuReduzido ? "left-20 w-[calc(100%-5rem)]" : "left-64 w-[calc(100%-16rem)]"}`}
    >
      <div className="flex justify-between items-center">
        <div 
          className="text-xs text-[#3a3a3a] tracking-[0.50px] max-w-md truncate"
          title={breadcrumbItems.map(item => item.label).join(' / ')}
        >
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="mx-2 text-[#999]">/</span>}
              {item.path ? (
                <Link 
                  to={item.path}
                  className="hover:text-blue-600 transition-colors duration-200 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-[#666] font-medium">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center gap-[30px]">
          <Avatar
            className="!relative"
            shape="circle"
            size="large"
            type="image"
            initials="U"
          />
          <ExitToApp className="w-6 h-6" color="#3A3A3A" />
        </div>
      </div>
      <div
        className={`fixed top-0 z-30 h-screen w-px bg-[#c1c1c1] ${menuReduzido ? "left-20" : "left-64"}`}
      />
    </div>
  );
}; 
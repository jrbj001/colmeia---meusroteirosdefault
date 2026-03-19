import React, { useState } from 'react';
import { Topbar } from '../Topbar';
import { Sidebar } from '../Sidebar';

export const Navbar: React.FC = () => {
  const [menuReduzido, setMenuReduzido] = useState(false);

  return (
    <>
      <Topbar />
      <Sidebar menuReduzido={menuReduzido} setMenuReduzido={setMenuReduzido} />
    </>
  );
};

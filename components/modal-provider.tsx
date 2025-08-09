"use client";

import { useEffect, useState } from "react";
import { BusinessUnitModal } from "./modals/business-unit-modal";



export const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <BusinessUnitModal />
    </>
  );
}

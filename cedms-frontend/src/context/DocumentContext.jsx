import { createContext, useState } from "react";

export const DocumentContext = createContext();

export const DocumentProvider = ({ children }) => {
  const [documents, setDocuments] = useState([]);

  const addDocument = (doc) => {
    setDocuments((prev) => [...prev, doc]);
  };

  return (
    <DocumentContext.Provider value={{ documents, setDocuments, addDocument }}>
      {children}
    </DocumentContext.Provider>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Simulation mode — allow all access
  return <>{children}</>;
};

export default ProtectedRoute;

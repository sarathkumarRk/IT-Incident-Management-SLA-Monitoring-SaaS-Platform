import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/Navbar";

function App() {
  const token = localStorage.getItem("access_token");

  return (
    <>
      {token && <Navbar />}
      <AppRoutes />
    </>
  );
}

export default App;


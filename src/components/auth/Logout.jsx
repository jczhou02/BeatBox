import { doLogout } from "../../app/actions";

const Logout = () => {
  const handleLogout = async (event) => {
    event.preventDefault(); // Prevent default form submission behavior
    await doLogout(); // Perform server-side logout

    // Client-side reload to reflect the session changes
    window.location.reload(); 
  };

  return (
    <button
      className="bg-blue-400 my-2 text-white p-1 rounded"
      onClick={handleLogout} // Trigger the logout process
    >
      Logout
    </button>
  );
};

export default Logout;

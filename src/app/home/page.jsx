import Image from "next/image";
import Layout from "../components/layout";
import { Header } from "../components/header";
//import LoginForm from "../../components/auth/LoginForm";
//import Logout from "../../components/auth/Logout";
import { auth } from "../../auth";

import { redirect } from "next/navigation";

const HomePage = async () => {
    const session = await auth();

    if (!session?.user) redirect("/");

    // Provide a default fallback image in case the user doesn't have one
  const userImage = session?.user?.image || "/default-avatar.png"; // Replace with your default avatar image
    return (
        <Layout>
      <Header />
     
      <div className="flex justify-center items-center h-screen bg-dark-slate-gray">
        <div className="text-center">
          <img src="/beatboxlogofinal.svg" alt="BeatBox" width={180} height={37} />
          <Image
                src={session?.user?.image}
                alt={session?.user?.name}
                width={72}
                height={72}
                className="rounded-full"
            />          
          <pre>{/* Display user information here after login */}</pre>
        </div>
      </div>
    </Layout>
      
    );
};

export default HomePage;
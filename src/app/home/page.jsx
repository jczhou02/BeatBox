import Image from "next/image";
import Layout from "../components/layout";
import { Header } from "../components/header";
import { auth } from "../../auth";

import { redirect } from "next/navigation";

const HomePage = async () => {
    const session = await auth();

    if (!session?.user) redirect("/");

    return (
        <Layout>
      <Header />
     
      <div className="flex justify-center items-center h-full w-full bg-dark-slate-gray">
        <div className="text-center">
          <Image
                src={session?.user?.image || "/default_avatar.png"}
                alt={session?.user?.name}
                width={72}
                height={72}
                className="rounded-full mt-4"
                style={{ position: "relative", top: "20px" }}
            />          
          <pre>{/* Display user information here after login */}</pre>
        </div>
      </div>
    </Layout>
      
    );
};

export default HomePage;
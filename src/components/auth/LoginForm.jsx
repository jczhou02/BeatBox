import { doSocialLogin } from "../../app/actions/index";

const LoginForm = () => {
    return (
        <form action={doSocialLogin}>
            {/* <button className="bg-grey-400 text-black p-1 rounded-md m-1 text-lg" type="submit" name="action" value="google">
                Sign In With Google
            </button> */}

            <button className="w-full bg-green-400 hover:bg-green-700 text-black font-bold py-2 px-4 rounded" type="submit" name="action" value="spotify">
                Sign In Spotify
            </button>
        </form>
    );
};

export default LoginForm;

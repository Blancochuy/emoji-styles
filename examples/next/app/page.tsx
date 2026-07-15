import { Emoji } from "react-emoji-styles";
import { ResolutionExample } from "./resolution-example";

export default function Page() {
  return (
    <main>
      <h1>
        Ship consistently{" "}
        <Emoji emoji="🚀" provider="fluent-3d" label="Launch" size="xl" />
      </h1>
      <ResolutionExample />
    </main>
  );
}

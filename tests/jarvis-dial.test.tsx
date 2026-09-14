import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { JarvisDial } from "../src/components/jarvis/dial";
import type { CoreState } from "../src/components/jarvis/core";

const states: CoreState[] = ["idle", "listening", "thinking", "speaking", "offline"];

describe("dial de JARVIS", () => {
  it.each(states)("se monta en el estado real «%s»", async state => {
    await render(<JarvisDial state={state} />);
    expect(screen.getByText("J.A.R.V.I.S.")).toBeTruthy();
  });

  it("acepta una etiqueta propia sin romper el instrumento", async () => {
    await render(<JarvisDial state="idle" label="NÚCLEO" size={120} />);
    expect(screen.getByText("NÚCLEO")).toBeTruthy();
  });
});

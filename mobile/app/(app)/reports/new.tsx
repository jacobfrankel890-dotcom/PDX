import { Redirect } from "expo-router";

/** Legacy route — redirect to simple submit flow */
export default function NewReportScreen() {
  return <Redirect href="/(app)/submit" />;
}

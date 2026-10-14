import { Redirect } from 'expo-router';

/** The app opens on the Route tab. */
export default function Index() {
  return <Redirect href="/route" />;
}

import { Redirect } from 'expo-router';

export default function Index() {
  // Now it points to the index file inside the auth folder
  return <Redirect href="/(auth)/" />;
}
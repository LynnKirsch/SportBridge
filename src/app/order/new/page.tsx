import Link from "next/link";
import { redirect } from "next/navigation";

import { OrderIntakeForm } from "./order-intake-form";
import styles from "./order-intake.module.css";

export const metadata = {
  title: "Найденный товар — SportBridge",
  description: "Передайте SportBridge ссылку на спортивный товар для проверки и выкупа.",
};

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string | string[] }>;
}) {
  const requestedFlow = (await searchParams).flow;
  const flowId = typeof requestedFlow === "string" ? requestedFlow.trim() : "";

  if (!flowId) redirect("/");

  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Навигация">
        <Link href="/" className={styles.brand}>SportBridge</Link>
        <span className={styles.navMeta}>Выкуп и доставка спортивных товаров</span>
      </nav>

      <header className={styles.hero}>
        <h1>Найденный товар</h1>
        <p>
          Проверьте данные товара и уточните заявку. Наличие, итоговую стоимость
          и условия выкупа подтвердит менеджер.
        </p>
      </header>

      <OrderIntakeForm flowId={flowId} />
    </main>
  );
}

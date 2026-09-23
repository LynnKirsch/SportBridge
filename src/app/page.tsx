import Link from "next/link";

import { HomeProductSearch } from "./home-product-search";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.shell}>
      <header className={`${styles.header} ${styles.grid}`}>
        <Link className={styles.brand} href="/" aria-label="SportBridge, главная">
          SportBridge
        </Link>
        <p className={styles.descriptor}>Выкуп и доставка спортивных товаров</p>
      </header>

      <main>
        <section className={`${styles.hero} ${styles.grid}`} aria-labelledby="home-title">
          <h1 className={styles.headline} id="home-title">
            Найдите товар по ссылке
          </h1>

          <HomeProductSearch />

          <p className={styles.explanation}>
            Мы проверим товар, наличие и параметры заказа. Стоимость менеджер
            подтвердит после проверки.
          </p>

          <Link className={styles.catalogLink} href="#stores">
            Каталог магазинов
          </Link>

          <div className={styles.process} aria-label="Этапы начала заказа">
            <span>Ссылка</span>
            <span>Проверка</span>
            <span>Расчёт менеджера</span>
          </div>
        </section>

        <section className={`${styles.stores} ${styles.grid}`} id="stores" aria-labelledby="stores-title">
          <h2 className={styles.storesTitle} id="stores-title">Поддерживаемые магазины</h2>
          <ul className={styles.storeList}>
            <li>BIKE24</li>
            <li>Bike-Discount</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

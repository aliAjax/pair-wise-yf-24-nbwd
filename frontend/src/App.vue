<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import { routes } from "./router/routes";
import StatusBadge from "./components/common/StatusBadge.vue";
import DocumentsPage from "./pages/DocumentsPage.vue";
import ComparePage from "./pages/ComparePage.vue";
import RisksPage from "./pages/RisksPage.vue";
import ReviewPage from "./pages/ReviewPage.vue";
import MergePage from "./pages/MergePage.vue";

const active = ref<string>(routes[0]?.route ?? "/documents");
const current = computed(() => routes.find((route) => route.route === active.value) ?? routes[0]);

const pageComponents: Record<string, unknown> = {
  "/documents": DocumentsPage,
  "/compare": ComparePage,
  "/risks": RisksPage,
  "/review": ReviewPage,
  "/merge": MergePage
};
const activePage = shallowRef(pageComponents[active.value] ?? DocumentsPage);

function navigate(route: string) {
  active.value = route;
  activePage.value = pageComponents[route] ?? DocumentsPage;
}
</script>

<template>
  <div class="shell">
    <aside>
      <div class="brand">隐私政策差异对比器</div>
      <nav>
        <button
          v-for="route in routes"
          :key="route.route"
          :class="{ active: active === route.route }"
          @click="navigate(route.route)"
        >{{ route.name }}</button>
      </nav>
    </aside>
    <main class="page">
      <section class="page-head">
        <div>
          <p class="eyebrow">policy-diff</p>
          <h1>{{ current?.name }}</h1>
        </div>
        <StatusBadge value="LOCAL_DATA" />
      </section>
      <component :is="activePage" />
    </main>
  </div>
</template>

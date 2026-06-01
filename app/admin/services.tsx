import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, SectionList, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Body, Button, Card, Field, H2, H3, Row, Screen } from '../../src/components/UI';
import {
  addCategory, addService, deleteCategory, deleteService,
  getCategories, getServices,
} from '../../src/store/store';
import { Service, ServiceCategory } from '../../src/types';
import { theme } from '../../src/theme';

export default function Services() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const [newCatName, setNewCatName] = useState('');
  const [newCatIsNail, setNewCatIsNail] = useState(false);

  const reload = useCallback(async () => {
    setCategories(await getCategories());
    setServices(await getServices());
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  async function addSvc() {
    if (!name.trim()) return Alert.alert('Enter the service name');
    if (!selectedCatId) return Alert.alert('Select a category first');
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) return Alert.alert('Enter a valid price');
    await addService(name.trim(), p, selectedCatId);
    setName('');
    setPrice('');
    reload();
  }

  async function addCat() {
    if (!newCatName.trim()) return Alert.alert('Enter the category name');
    await addCategory(newCatName.trim(), newCatIsNail);
    setNewCatName('');
    setNewCatIsNail(false);
    reload();
  }

  function confirmDeleteService(s: Service) {
    Alert.alert('Remove service?', `Remove ${s.name}? Past logs are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteService(s.id); reload(); } },
    ]);
  }

  function confirmDeleteCategory(c: ServiceCategory) {
    const catServices = services.filter((s) => s.categoryId === c.id);
    Alert.alert(
      'Remove category?',
      `Remove "${c.name}"? ${catServices.length} service(s) in it will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            for (const s of catServices) await deleteService(s.id);
            await deleteCategory(c.id);
            reload();
          },
        },
      ]
    );
  }

  const sections = categories.map((cat) => ({
    title: cat.name,
    isNailRelated: cat.isNailRelated,
    catId: cat.id,
    data: services.filter((s) => s.categoryId === cat.id),
  }));

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={
          <>
            {/* Add category */}
            <Card>
              <H2>Add a category</H2>
              <Field label="Category name" value={newCatName} onChangeText={setNewCatName} placeholder="e.g. Hair Services" />
              <Pressable
                onPress={() => setNewCatIsNail(!newCatIsNail)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.md }}
              >
                <View style={{
                  width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                  borderColor: theme.colors.primary,
                  backgroundColor: newCatIsNail ? theme.colors.primary : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {newCatIsNail && <Body style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Body>}
                </View>
                <Body>Nail-related (enables color filter)</Body>
              </Pressable>
              <Button title="Add category" onPress={addCat} />
            </Card>

            {/* Add service */}
            <Card>
              <H2>Add a service</H2>
              <Body style={{ marginBottom: theme.spacing.xs, fontWeight: '600' }}>Category</Body>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md }}>
                {categories.map((c) => {
                  const active = c.id === selectedCatId;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setSelectedCatId(c.id)}
                      style={{
                        paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
                        borderRadius: 999, backgroundColor: active ? theme.colors.primary : theme.colors.bg,
                        borderWidth: 1, borderColor: active ? theme.colors.primary : theme.colors.border,
                      }}
                    >
                      <Body style={{ color: active ? '#fff' : theme.colors.text, fontWeight: '600' }}>{c.name}</Body>
                    </Pressable>
                  );
                })}
              </View>
              <Field label="Service name" value={name} onChangeText={setName} placeholder="e.g. Balayage" />
              <Field label="Price ($)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" />
              <Button title="Add service" onPress={addSvc} />
            </Card>

            <H2>Service menu</H2>
          </>
        }
        renderSectionHeader={({ section }) => (
          <Card style={{ backgroundColor: theme.colors.accent }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <H3 style={{ marginBottom: 0 }}>{section.title}</H3>
                <Body muted>{section.isNailRelated ? 'Nail-related · Color filter enabled' : ''}</Body>
              </View>
              <Button title="Remove" variant="danger" onPress={() => {
                const cat = categories.find((c) => c.id === section.catId);
                if (cat) confirmDeleteCategory(cat);
              }} />
            </Row>
          </Card>
        )}
        renderItem={({ item }) => (
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <H3 style={{ marginBottom: 0 }}>{item.name}</H3>
                <Body muted>${item.price.toFixed(2)}</Body>
              </View>
              <Button title="Remove" variant="danger" onPress={() => confirmDeleteService(item)} />
            </Row>
          </Card>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? (
            <Card><Body muted>No services in this category.</Body></Card>
          ) : null
        }
        ListEmptyComponent={<Card><Body muted>No categories yet.</Body></Card>}
      />
    </Screen>
  );
}

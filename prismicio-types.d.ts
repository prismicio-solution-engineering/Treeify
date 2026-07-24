import type * as prismic from "@prismicio/client";

type Simplify<T> = { [KeyType in keyof T]: T[KeyType] };


type PickContentRelationshipFieldData<
	TRelationship extends prismic.CustomTypeModelFetchCustomTypeLevel1 | prismic.CustomTypeModelFetchCustomTypeLevel2 | prismic.CustomTypeModelFetchGroupLevel1 | prismic.CustomTypeModelFetchGroupLevel2,
	TData extends Record<string, prismic.AnyRegularField | prismic.GroupField | prismic.NestedGroupField | prismic.SliceZone>,
	TLang extends string
> = |
	// Content relationship fields
	{
		[TSubRelationship in Extract<
			TRelationship["fields"][number], prismic.CustomTypeModelFetchContentRelationshipLevel1
		> as TSubRelationship["id"]]:
			ContentRelationshipFieldWithData<TSubRelationship["customtypes"], TLang>;
	} &
	// Group
	{
		[TGroup in Extract<
			TRelationship["fields"][number], prismic.CustomTypeModelFetchGroupLevel1 | prismic.CustomTypeModelFetchGroupLevel2
		> as TGroup["id"]]:
			TData[TGroup["id"]] extends prismic.GroupField<infer TGroupData>
				? prismic.GroupField<PickContentRelationshipFieldData<TGroup, TGroupData, TLang>>
				: never
	} &
	// Other fields
	{
		[TFieldKey in Extract<TRelationship["fields"][number], string>]:
			TFieldKey extends keyof TData ? TData[TFieldKey] : never;
	};

type ContentRelationshipFieldWithData<
	TCustomType extends readonly (prismic.CustomTypeModelFetchCustomTypeLevel1 | string)[] | readonly (prismic.CustomTypeModelFetchCustomTypeLevel2 | string)[],
	TLang extends string = string
> = {
	[ID in Exclude<TCustomType[number], string>["id"]]:
		prismic.ContentRelationshipField<
			ID,
			TLang,
			PickContentRelationshipFieldData<
				Extract<TCustomType[number], { id: ID }>,
				Extract<prismic.Content.AllDocumentTypes, { type: ID }>["data"],
				TLang
			>
		>
}[Exclude<TCustomType[number], string>["id"]];

type ComponentDocumentDataSlicesSlice = never

/**
 * Content for Component documents
 */
interface ComponentDocumentData {
	/**
	 * Slice Zone field in *Component*
	 *
	 * - **Field Type**: Slice Zone
	 * - **Placeholder**: *None*
	 * - **API ID Path**: component.slices[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/slices
	 */
	slices: prismic.SliceZone<ComponentDocumentDataSlicesSlice>;
	
	/**
	 * Title field in *Component*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: component.title
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	title: prismic.KeyTextField;
	
	/**
	 * Related Component field in *Component*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: component.related_component
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	related_component: prismic.ContentRelationshipField<"component">;/**
	 * Meta Title field in *Component*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A title of the page used for social media and search engines
	 * - **API ID Path**: component.meta_title
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_title: prismic.KeyTextField;
	
	/**
	 * Meta Description field in *Component*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A brief summary of the page
	 * - **API ID Path**: component.meta_description
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_description: prismic.KeyTextField;
	
	/**
	 * Meta Image field in *Component*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: component.meta_image
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	meta_image: prismic.ImageField<never>;
}

/**
 * Component document from Prismic
 *
 * - **API ID**: `component`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type ComponentDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<Simplify<ComponentDocumentData>, "component", Lang>;

/**
 * Item in *Main Config → Sections*
 */
export interface MainConfigDocumentDataSectionsItem {
	/**
	 * Section field in *Main Config → Sections*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: main_config.sections[].section
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	section: prismic.ContentRelationshipField<"section">;
}

/**
 * Content for Main Config documents
 */
interface MainConfigDocumentData {
	/**
	 * Title field in *Main Config*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: main_config.title
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	title: prismic.KeyTextField;
	
	/**
	 * Sections field in *Main Config*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: main_config.sections[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	sections: prismic.GroupField<Simplify<MainConfigDocumentDataSectionsItem>>;
}

/**
 * Main Config document from Prismic
 *
 * - **API ID**: `main_config`
 * - **Repeatable**: `false`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type MainConfigDocument<Lang extends string = string> = prismic.PrismicDocumentWithoutUID<Simplify<MainConfigDocumentData>, "main_config", Lang>;

/**
 * Item in *Master Config → Global Components*
 */
export interface MasterConfigDocumentDataGlobalComponentsItem {
	/**
	 * Component field in *Master Config → Global Components*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: master_config.global_components[].component
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	component: prismic.ContentRelationshipField<"component">;
}

/**
 * Content for Master Config documents
 */
interface MasterConfigDocumentData {
	/**
	 * Title field in *Master Config*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: master_config.title
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	title: prismic.KeyTextField;
	
	/**
	 * Main (root child) field in *Master Config*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: master_config.main
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	main: prismic.ContentRelationshipField<"main_config">;
	
	/**
	 * Global Components field in *Master Config*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: master_config.global_components[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	global_components: prismic.GroupField<Simplify<MasterConfigDocumentDataGlobalComponentsItem>>;
}

/**
 * Master Config document from Prismic
 *
 * - **API ID**: `master_config`
 * - **Repeatable**: `false`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type MasterConfigDocument<Lang extends string = string> = prismic.PrismicDocumentWithoutUID<Simplify<MasterConfigDocumentData>, "master_config", Lang>;

type SectionDocumentDataSlicesSlice = ViewConfigListSlice

/**
 * Content for Section documents
 */
interface SectionDocumentData {
	/**
	 * Slice Zone field in *Section*
	 *
	 * - **Field Type**: Slice Zone
	 * - **Placeholder**: *None*
	 * - **API ID Path**: section.slices[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/slices
	 */
	slices: prismic.SliceZone<SectionDocumentDataSlicesSlice>;
	
	/**
	 * Title field in *Section*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: section.title
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	title: prismic.KeyTextField;
	
	/**
	 * Default View Config field in *Section*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: section.default_view_config
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	default_view_config: prismic.ContentRelationshipField<"view_config">;/**
	 * Meta Title field in *Section*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A title of the page used for social media and search engines
	 * - **API ID Path**: section.meta_title
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_title: prismic.KeyTextField;
	
	/**
	 * Meta Description field in *Section*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A brief summary of the page
	 * - **API ID Path**: section.meta_description
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_description: prismic.KeyTextField;
	
	/**
	 * Meta Image field in *Section*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: section.meta_image
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	meta_image: prismic.ImageField<never>;
}

/**
 * Section document from Prismic
 *
 * - **API ID**: `section`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type SectionDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<Simplify<SectionDocumentData>, "section", Lang>;

type ViewDocumentDataSlicesSlice = ComponentGridSlice

/**
 * Item in *View → Components*
 */
export interface ViewDocumentDataComponentsItem {
	/**
	 * Component field in *View → Components*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: view.components[].component
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	component: prismic.ContentRelationshipField<"component">;
}

/**
 * Content for View documents
 */
interface ViewDocumentData {
	/**
	 * Slice Zone field in *View*
	 *
	 * - **Field Type**: Slice Zone
	 * - **Placeholder**: *None*
	 * - **API ID Path**: view.slices[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/slices
	 */
	slices: prismic.SliceZone<ViewDocumentDataSlicesSlice>;
	
	/**
	 * Title field in *View*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: view.title
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	title: prismic.KeyTextField;
	
	/**
	 * Components field in *View*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: view.components[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	components: prismic.GroupField<Simplify<ViewDocumentDataComponentsItem>>;/**
	 * Meta Title field in *View*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A title of the page used for social media and search engines
	 * - **API ID Path**: view.meta_title
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_title: prismic.KeyTextField;
	
	/**
	 * Meta Description field in *View*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A brief summary of the page
	 * - **API ID Path**: view.meta_description
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_description: prismic.KeyTextField;
	
	/**
	 * Meta Image field in *View*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: view.meta_image
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	meta_image: prismic.ImageField<never>;
}

/**
 * View document from Prismic
 *
 * - **API ID**: `view`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type ViewDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<Simplify<ViewDocumentData>, "view", Lang>;

type ViewConfigDocumentDataSlicesSlice = never

/**
 * Item in *View Config → Fallback Views*
 */
export interface ViewConfigDocumentDataFallbackViewsItem {
	/**
	 * View field in *View Config → Fallback Views*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: view_config.fallback_views[].view
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	view: prismic.ContentRelationshipField<"view">;
}

/**
 * Content for View Config documents
 */
interface ViewConfigDocumentData {
	/**
	 * Slice Zone field in *View Config*
	 *
	 * - **Field Type**: Slice Zone
	 * - **Placeholder**: *None*
	 * - **API ID Path**: view_config.slices[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/slices
	 */
	slices: prismic.SliceZone<ViewConfigDocumentDataSlicesSlice>;
	
	/**
	 * Title field in *View Config*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: *None*
	 * - **API ID Path**: view_config.title
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	title: prismic.KeyTextField;
	
	/**
	 * View (primary child) field in *View Config*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: view_config.view
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	view: prismic.ContentRelationshipField<"view">;
	
	/**
	 * Fallback Views field in *View Config*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: view_config.fallback_views[]
	 * - **Tab**: Main
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	fallback_views: prismic.GroupField<Simplify<ViewConfigDocumentDataFallbackViewsItem>>;/**
	 * Meta Title field in *View Config*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A title of the page used for social media and search engines
	 * - **API ID Path**: view_config.meta_title
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_title: prismic.KeyTextField;
	
	/**
	 * Meta Description field in *View Config*
	 *
	 * - **Field Type**: Text
	 * - **Placeholder**: A brief summary of the page
	 * - **API ID Path**: view_config.meta_description
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/text
	 */
	meta_description: prismic.KeyTextField;
	
	/**
	 * Meta Image field in *View Config*
	 *
	 * - **Field Type**: Image
	 * - **Placeholder**: *None*
	 * - **API ID Path**: view_config.meta_image
	 * - **Tab**: SEO & Metadata
	 * - **Documentation**: https://prismic.io/docs/fields/image
	 */
	meta_image: prismic.ImageField<never>;
}

/**
 * View Config document from Prismic
 *
 * - **API ID**: `view_config`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/content-modeling
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type ViewConfigDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<Simplify<ViewConfigDocumentData>, "view_config", Lang>;

export type AllDocumentTypes = ComponentDocument | MainConfigDocument | MasterConfigDocument | SectionDocument | ViewDocument | ViewConfigDocument;

/**
 * Item in *Component Grid → Default → Primary → Components*
 */
export interface ComponentGridSliceDefaultPrimaryItemsItem {
	/**
	 * Component field in *Component Grid → Default → Primary → Components*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: component_grid.default.primary.items[].component
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	component: prismic.ContentRelationshipField<"component">;
}

/**
 * Primary content in *Component Grid → Default → Primary*
 */
export interface ComponentGridSliceDefaultPrimary {
	/**
	 * Components field in *Component Grid → Default → Primary*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: component_grid.default.primary.items[]
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	items: prismic.GroupField<Simplify<ComponentGridSliceDefaultPrimaryItemsItem>>;
}

/**
 * Default variation for Component Grid Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type ComponentGridSliceDefault = prismic.SharedSliceVariation<"default", Simplify<ComponentGridSliceDefaultPrimary>, never>;

/**
 * Slice variation for *Component Grid*
 */
type ComponentGridSliceVariation = ComponentGridSliceDefault

/**
 * Component Grid Shared Slice
 *
 * - **API ID**: `component_grid`
 * - **Description**: *None*
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type ComponentGridSlice = prismic.SharedSlice<"component_grid", ComponentGridSliceVariation>;

/**
 * Item in *View Config List → Default → Primary → View Configs*
 */
export interface ViewConfigListSliceDefaultPrimaryItemsItem {
	/**
	 * View Config field in *View Config List → Default → Primary → View Configs*
	 *
	 * - **Field Type**: Content Relationship
	 * - **Placeholder**: *None*
	 * - **API ID Path**: view_config_list.default.primary.items[].view_config
	 * - **Documentation**: https://prismic.io/docs/fields/content-relationship
	 */
	view_config: prismic.ContentRelationshipField<"view_config">;
}

/**
 * Primary content in *View Config List → Default → Primary*
 */
export interface ViewConfigListSliceDefaultPrimary {
	/**
	 * View Configs field in *View Config List → Default → Primary*
	 *
	 * - **Field Type**: Group
	 * - **Placeholder**: *None*
	 * - **API ID Path**: view_config_list.default.primary.items[]
	 * - **Documentation**: https://prismic.io/docs/fields/repeatable-group
	 */
	items: prismic.GroupField<Simplify<ViewConfigListSliceDefaultPrimaryItemsItem>>;
}

/**
 * Default variation for View Config List Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type ViewConfigListSliceDefault = prismic.SharedSliceVariation<"default", Simplify<ViewConfigListSliceDefaultPrimary>, never>;

/**
 * Slice variation for *View Config List*
 */
type ViewConfigListSliceVariation = ViewConfigListSliceDefault

/**
 * View Config List Shared Slice
 *
 * - **API ID**: `view_config_list`
 * - **Description**: *None*
 * - **Documentation**: https://prismic.io/docs/slices
 */
export type ViewConfigListSlice = prismic.SharedSlice<"view_config_list", ViewConfigListSliceVariation>;

declare module "@prismicio/client" {
	interface CreateClient {
		(repositoryNameOrEndpoint: string, options?: prismic.ClientConfig): prismic.Client<AllDocumentTypes>;
	}
	
	interface CreateWriteClient {
		(repositoryNameOrEndpoint: string, options: prismic.WriteClientConfig): prismic.WriteClient<AllDocumentTypes>;
	}
	
	interface CreateMigration {
		(): prismic.Migration<AllDocumentTypes>;
	}
	
	namespace Content {
		export type {
			ComponentDocument,
			ComponentDocumentData,
			ComponentDocumentDataSlicesSlice,
			MainConfigDocument,
			MainConfigDocumentData,
			MainConfigDocumentDataSectionsItem,
			MasterConfigDocument,
			MasterConfigDocumentData,
			MasterConfigDocumentDataGlobalComponentsItem,
			SectionDocument,
			SectionDocumentData,
			SectionDocumentDataSlicesSlice,
			ViewDocument,
			ViewDocumentData,
			ViewDocumentDataSlicesSlice,
			ViewDocumentDataComponentsItem,
			ViewConfigDocument,
			ViewConfigDocumentData,
			ViewConfigDocumentDataSlicesSlice,
			ViewConfigDocumentDataFallbackViewsItem,
			AllDocumentTypes,
			ComponentGridSlice,
			ComponentGridSliceDefaultPrimaryItemsItem,
			ComponentGridSliceDefaultPrimary,
			ComponentGridSliceVariation,
			ComponentGridSliceDefault,
			ViewConfigListSlice,
			ViewConfigListSliceDefaultPrimaryItemsItem,
			ViewConfigListSliceDefaultPrimary,
			ViewConfigListSliceVariation,
			ViewConfigListSliceDefault
		}
	}
}